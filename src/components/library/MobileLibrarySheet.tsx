import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { FileText, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePlayerStore } from '~/stores/player-store'
import { useUiStore } from '~/stores/ui-store'
import { extractSamiTrailerBytes } from '~/lib/sami-trailer'
import { transcodeToMp4 } from '~/lib/transcode'
import {
  basenameNoExt,
  detectFileMediaType,
  formatBytes,
  needsVideoTranscode,
  type AssetItem,
  type FolderListItem,
  type FolderRow as FolderRowType,
  type LibraryMediaType,
  type PendingItem,
} from '~/components/library/library-shared'
import {
  ActionBar,
  AssetRow,
  BreadcrumbChips,
  FolderRow,
  PendingRow,
  SectionLabel,
  StorageGauge,
} from '~/components/library/library-atoms'
import {
  createFolder,
  getFolderTree,
  getStorageUsage,
  listFolderContents,
  confirmUpload,
} from '~/server/storage'

type Props = {
  userId: string
  onPlay: (params: {
    url: string
    name: string
    mediaType: 'audio' | 'video'
    lrcUrl?: string
  }) => void
}

type Usage = Awaited<ReturnType<typeof getStorageUsage>>

export function MobileLibrarySheet({ userId, onPlay }: Props) {
  const isOpen = useUiStore((s) => s.isMobileLibraryOpen)
  const close = useUiStore((s) => s.closeMobileLibrary)
  const playingFileName = usePlayerStore((s) => s.fileName)
  const playStatus = usePlayerStore((s) => s.status)

  const [tree, setTree] = useState<FolderRowType[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<FolderListItem[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [usage, setUsage] = useState<Usage>({
    used: 0,
    quota: 1,
    byType: { audio: 0, video: 0, lyrics: 0 },
  })
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<PendingItem[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [submittingFolder, setSubmittingFolder] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const refreshTree = useCallback(async () => {
    const rows = await getFolderTree()
    setTree(rows as FolderRowType[])
  }, [])

  const refreshContents = useCallback(async (folderId: string | null) => {
    setLoading(true)
    try {
      const data = await listFolderContents({ data: { folderId } })
      setFolders(data.folders as FolderListItem[])
      setAssets(data.assets as AssetItem[])
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshUsage = useCallback(async () => {
    const u = await getStorageUsage()
    setUsage(u)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    refreshTree()
    refreshUsage()
  }, [isOpen, refreshTree, refreshUsage])

  useEffect(() => {
    if (!isOpen) return
    refreshContents(currentFolderId)
  }, [isOpen, currentFolderId, refreshContents])

  useEffect(() => {
    if (!isOpen) return
    const isMobile = window.matchMedia('(max-width: 1023.98px)').matches
    if (!isMobile) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (creating) {
          setCreating(false)
          setNewName('')
        } else {
          close()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, creating, close])

  const breadcrumb = useMemo(() => {
    const map = new Map(tree.map((f) => [f.id, f]))
    const path: { id: string | null; name: string }[] = [{ id: null, name: '홈' }]
    let cur: FolderRowType | undefined = currentFolderId
      ? map.get(currentFolderId)
      : undefined
    const chain: FolderRowType[] = []
    while (cur) {
      chain.unshift(cur)
      cur = cur.parentId ? map.get(cur.parentId) : undefined
    }
    for (const f of chain) path.push({ id: f.id, name: f.name })
    return path
  }, [tree, currentFolderId])

  const handleCreateFolder = useCallback(async () => {
    const name = newName.trim()
    if (!name || submittingFolder) return
    setSubmittingFolder(true)
    try {
      await createFolder({ data: { name, parentId: currentFolderId } })
      setNewName('')
      setCreating(false)
      await refreshTree()
      await refreshContents(currentFolderId)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '폴더 생성 실패')
    } finally {
      setSubmittingFolder(false)
    }
  }, [newName, submittingFolder, currentFolderId, refreshTree, refreshContents])

  const startUpload = useCallback(
    async (files: File[], targetFolderId: string | null) => {
      const classified = files.map((f) => ({ file: f, mediaType: detectFileMediaType(f) }))
      const acceptable = classified.filter(
        (c): c is { file: File; mediaType: LibraryMediaType } => c.mediaType !== null,
      )
      const rejected = files.length - acceptable.length
      if (rejected > 0) {
        toast.error(`${rejected}개 파일은 지원 형식이 아니라 제외됨 (오디오/비디오/.lrc)`)
      }
      if (acceptable.length === 0) return

      const totalNew = acceptable.reduce((s, c) => s + c.file.size, 0)
      if (usage.used + totalNew > usage.quota) {
        toast.error(
          `용량 초과: ${formatBytes(usage.used + totalNew)} / ${formatBytes(usage.quota)}`,
        )
        return
      }

      const jobs = acceptable.map(({ file, mediaType }) => ({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
        file,
        mediaType,
      }))

      setPending((prev) => [
        ...prev,
        ...jobs.map<PendingItem>((j) => ({
          key: j.key,
          name: j.file.name,
          mediaType: j.mediaType,
          folderId: targetFolderId,
          phase: j.mediaType === 'video' ? 'preparing' : 'uploading',
          progress: 0,
        })),
      ])

      const setItem = (key: string, patch: Partial<PendingItem>) =>
        setPending((prev) =>
          prev.map((p) => (p.key === key ? { ...p, ...patch } : p)),
        )

      for (const job of jobs) {
        let toUpload: File = job.file
        let finalName = job.file.name
        let finalMime =
          job.mediaType === 'lyrics'
            ? 'application/octet-stream'
            : job.file.type

        if (job.mediaType === 'video') {
          let need = false
          try {
            need = await needsVideoTranscode(job.file)
          } catch {
            need = false
          }
          if (need) {
            const trailerBytes = await extractSamiTrailerBytes(job.file).catch(
              () => null,
            )
            setItem(job.key, { phase: 'transcoding', progress: 0 })
            try {
              const transcoded = await transcodeToMp4(job.file, ({ ratio }) => {
                setItem(job.key, { progress: ratio * 100 })
              })
              if (trailerBytes) {
                toUpload = new File(
                  [transcoded, trailerBytes],
                  transcoded.name,
                  { type: 'video/mp4', lastModified: Date.now() },
                )
              } else {
                toUpload = transcoded
              }
              finalName = toUpload.name
              finalMime = 'video/mp4'
              setItem(job.key, { name: finalName })
            } catch (e) {
              const msg = e instanceof Error ? e.message : '변환 실패'
              setItem(job.key, { phase: 'error', errorMessage: msg, progress: 0 })
              toast.error(`${job.file.name}: 변환 실패`)
              continue
            }
          }
        }

        setItem(job.key, { phase: 'uploading', progress: 0 })
        try {
          const pathname = `users/${userId}/${finalName}`
          const blob = await upload(pathname, toUpload, {
            access: 'public',
            handleUploadUrl: '/api/blob/upload',
            clientPayload: JSON.stringify({
              size: toUpload.size,
              folderId: targetFolderId,
            }),
            contentType: finalMime,
            onUploadProgress: ({ percentage }) => {
              setItem(job.key, { progress: percentage })
            },
          })
          await confirmUpload({
            data: {
              blobUrl: blob.url,
              blobPathname: blob.pathname,
              name: finalName,
              mimeType: finalMime,
              sizeBytes: toUpload.size,
              folderId: targetFolderId,
            },
          })
          setPending((prev) => prev.filter((p) => p.key !== job.key))
          await refreshContents(targetFolderId)
          await refreshUsage()
        } catch (e) {
          const msg = e instanceof Error ? e.message : '업로드 실패'
          setItem(job.key, { phase: 'error', errorMessage: msg })
          toast.error(`${job.file.name}: ${msg}`)
        }
      }
    },
    [userId, usage, refreshContents, refreshUsage],
  )

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) startUpload(files, currentFolderId)
      e.target.value = ''
    },
    [startUpload, currentFolderId],
  )

  const handlePlay = useCallback(
    (asset: AssetItem) => {
      const stem = basenameNoExt(asset.name)
      const sibling = assets.find(
        (s) => s.mediaType === 'lyrics' && basenameNoExt(s.name) === stem,
      )
      onPlay({
        url: asset.blobUrl,
        name: asset.name,
        mediaType: asset.mediaType === 'video' ? 'video' : 'audio',
        lrcUrl: sibling?.blobUrl,
      })
      close()
    },
    [assets, onPlay, close],
  )

  const onBodyDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    setDragActive(true)
  }, [])
  const onBodyDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setDragActive(false)
  }, [])
  const onBodyDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragActive(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) startUpload(files, currentFolderId)
    },
    [startUpload, currentFolderId],
  )

  const pendingHere = pending.filter((p) => p.folderId === currentFolderId)
  const isEmpty =
    !loading &&
    folders.length === 0 &&
    assets.length === 0 &&
    pendingHere.length === 0

  return (
    <div
      className={`lg:hidden fixed inset-0 z-50 ${
        isOpen ? '' : 'pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={close}
        aria-label="닫기"
        tabIndex={isOpen ? 0 : -1}
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="내 미디어"
        // 닫힘 상태(translate-y-full)에서도 box-shadow 가 위로 새어 모바일
        // 뷰포트 하단에 그라데이션처럼 누수되는 회귀(#88) 회피 — 열렸을 때만 켠다.
        className={`absolute bottom-0 left-0 right-0 flex h-[88vh] max-h-[760px] flex-col rounded-t-[20px] bg-card text-foreground transition-transform duration-250 ease-out ${
          isOpen
            ? 'translate-y-0 shadow-[0_-20px_50px_rgba(0,0,0,0.6)]'
            : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-white/25" />
        </div>

        {/* Header — title + close. 디자인 v2 에서는 헤더에 도넛 게이지 대신 본문
            상단으로 풀폭 StorageGauge 를 이동시킨다. */}
        <div className="flex items-center justify-between px-5 pb-1 pt-2.5">
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">
            내 미디어
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/15 cursor-pointer"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        {/* Storage gauge */}
        <div className="px-5 pb-3.5 pt-3">
          <StorageGauge
            used={usage.used}
            quota={usage.quota}
            byType={usage.byType}
          />
        </div>

        {/* Breadcrumb */}
        <div className="px-4">
          <BreadcrumbChips crumbs={breadcrumb} onSelect={setCurrentFolderId} />
        </div>

        {/* Scrollable body */}
        <div
          onDragOver={onBodyDragOver}
          onDragLeave={onBodyDragLeave}
          onDrop={onBodyDrop}
          className={`relative flex-1 min-h-0 overflow-y-auto px-5 pb-3 ${
            dragActive ? 'ring-2 ring-primary ring-inset' : ''
          }`}
        >
          {isEmpty ? (
            <EmptyDropZone onPickFiles={() => fileInputRef.current?.click()} />
          ) : (
            <>
              {pendingHere.length > 0 && (
                <>
                  <SectionLabel right={`${pendingHere.length}개`}>
                    업로드 중
                  </SectionLabel>
                  {pendingHere.map((p) => (
                    <PendingRow
                      key={p.key}
                      row={p}
                      onDismiss={() =>
                        setPending((prev) => prev.filter((x) => x.key !== p.key))
                      }
                    />
                  ))}
                </>
              )}

              {folders.length > 0 && (
                <>
                  <SectionLabel right={`${folders.length}`}>폴더</SectionLabel>
                  {folders.map((f) => (
                    <FolderRow
                      key={f.id}
                      name={f.name}
                      onClick={() => setCurrentFolderId(f.id)}
                    />
                  ))}
                </>
              )}

              {assets.length > 0 && (
                <>
                  <SectionLabel right={`${assets.length}`}>파일</SectionLabel>
                  {assets.map((a) => {
                    const isPlaying =
                      a.mediaType !== 'lyrics' &&
                      a.name === playingFileName &&
                      playStatus === 'playing'
                    const isActive =
                      a.mediaType !== 'lyrics' && a.name === playingFileName
                    return (
                      <AssetRow
                        key={a.id}
                        asset={a}
                        active={isActive}
                        playing={isPlaying}
                        onClick={() => {
                          if (a.mediaType === 'lyrics') return
                          handlePlay(a)
                        }}
                      />
                    )
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* Sticky bottom action bar — 일반/생성 모핑 */}
        <div className="border-t border-border bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <ActionBar
            creating={creating}
            newName={newName}
            setNewName={setNewName}
            onStartCreate={() => setCreating(true)}
            onCancelCreate={() => {
              setCreating(false)
              setNewName('')
            }}
            onSubmitCreate={handleCreateFolder}
            onPickFiles={() => fileInputRef.current?.click()}
            submittingFolder={submittingFolder}
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*,.lrc,.mpg,.mpeg,.avi,.mkv,.flv,.wmv,.3gp"
          multiple
          className="hidden"
          onChange={onFileInputChange}
        />
      </aside>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Empty state (folder is empty) — 디자인 v2 와 동일 유지
// ─────────────────────────────────────────────────────────

function EmptyDropZone({ onPickFiles }: { onPickFiles: () => void }) {
  return (
    <div className="flex h-full flex-col py-3">
      <button
        type="button"
        onClick={onPickFiles}
        className="flex flex-1 cursor-pointer flex-col items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.025] px-8 text-center"
      >
        <div className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary-bright">
          <Upload className="size-7" />
        </div>
        <div>
          <div className="text-[17px] font-extrabold tracking-[-0.02em] text-foreground">
            이 폴더는 비어 있어요
          </div>
          <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-muted-foreground">
            여기에 파일을 드래그하거나, 아래{' '}
            <span className="font-bold text-foreground">업로드</span> 버튼으로
            추가하세요.
          </p>
        </div>
        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          {['mp3', 'mp4', 'webm', 'mov', 'lrc', 'smi'].map((ext) => (
            <span
              key={ext}
              className="rounded-full bg-secondary px-2 py-[3px] font-mono text-[10px] font-bold text-muted-foreground"
            >
              {ext}
            </span>
          ))}
        </div>
      </button>

      <div className="mt-3.5 flex items-center gap-3 rounded-xl bg-secondary p-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-bright">
          <FileText className="size-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-foreground">
            같은 이름의 .lrc / .smi 자막을 함께 올려보세요
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            재생 시 자동으로 매칭돼 카라오케 가사가 표시됩니다.
          </div>
        </div>
      </div>
    </div>
  )
}
