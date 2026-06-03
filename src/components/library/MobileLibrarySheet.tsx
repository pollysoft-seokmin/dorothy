import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { usePlayerStore } from '~/stores/player-store'
import { useUiStore } from '~/stores/ui-store'
import { extractSamiTrailerBytes } from '~/lib/sami-trailer'
import { transcodeToMp4 } from '~/lib/transcode'
import {
  basenameNoExt,
  detectFileMediaType,
  formatBytes,
  isUploadActive,
  needsVideoTranscode,
  type AssetItem,
  type FavoriteItem,
  type FolderListItem,
  type FolderRow as FolderRowType,
  type LibraryMediaType,
  type PendingItem,
} from '~/components/library/library-shared'
import {
  AssetRow,
  BreadcrumbChips,
  CreateFolderDialog,
  FavoritesList,
  FolderRow,
  LibraryActionsMenu,
  LibraryTabs,
  PendingRow,
  RecentPlaybackList,
  SectionLabel,
  UploadSummaryCell,
  type LibraryTab,
} from '~/components/library/library-atoms'
import { useFavoritesStore } from '~/stores/favorites-store'
import { useUploadStore } from '~/stores/upload-store'
import { useRecentPlaybacks } from '~/hooks/useRecentPlaybacks'
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
    mediaAssetId?: string
  }) => void
}

type Usage = Awaited<ReturnType<typeof getStorageUsage>>

export function MobileLibrarySheet({ userId, onPlay }: Props) {
  const isOpen = useUiStore((s) => s.isMobileLibraryOpen)
  const close = useUiStore((s) => s.closeMobileLibrary)
  const playingFileName = usePlayerStore((s) => s.fileName)
  const playStatus = usePlayerStore((s) => s.status)

  const favItems = useFavoritesStore((s) => s.items)
  const favLoaded = useFavoritesStore((s) => s.loaded)
  const loadFavorites = useFavoritesStore((s) => s.load)
  const removeFavorite = useFavoritesStore((s) => s.toggle)
  const reorderFavorites = useFavoritesStore((s) => s.reorder)

  const [tab, setTab] = useState<LibraryTab>('folders')
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
  // 업로드 진행은 전역 store — 헤더의 원형 진행 링과 단일 소스를 공유한다.
  const pending = useUploadStore((s) => s.items)
  const setPending = useUploadStore((s) => s.setItems)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [submittingFolder, setSubmittingFolder] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 최근 탭 — 시트가 열려 있고 최근 탭일 때만 fetch. 재생 시 onPlay 후 시트를 닫는다.
  const {
    recent,
    error: recentError,
    resolvingId,
    playRecent,
  } = useRecentPlaybacks({
    active: isOpen && tab === 'recent',
    onResolved: (payload) => {
      onPlay(payload)
      close()
    },
  })

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

  // 배치 완료(활성 0) 시 done 항목 정리 — 요약 셀 사라지고 실패 행만 남는다.
  useEffect(() => {
    if (pending.length === 0) return
    if (pending.some(isUploadActive)) return
    if (pending.some((p) => p.phase === 'done')) {
      setPending((prev) => prev.filter((p) => p.phase !== 'done'))
    }
  }, [pending])

  useEffect(() => {
    if (isOpen && tab === 'favorites') void loadFavorites()
  }, [isOpen, tab, loadFavorites])

  useEffect(() => {
    if (!isOpen) return
    const isMobile = window.matchMedia('(max-width: 1023.98px)').matches
    if (!isMobile) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 폴더 생성 팝업이 열려 있으면 팝업이 Escape 를 처리하도록 시트는 둔다.
        if (folderDialogOpen) return
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, folderDialogOpen, close])

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

  const handleCreateFolder = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed || submittingFolder) return
      setSubmittingFolder(true)
      try {
        await createFolder({ data: { name: trimmed, parentId: currentFolderId } })
        setFolderDialogOpen(false)
        await refreshTree()
        await refreshContents(currentFolderId)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '폴더 생성 실패')
      } finally {
        setSubmittingFolder(false)
      }
    },
    [submittingFolder, currentFolderId, refreshTree, refreshContents],
  )

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
          segments: j.mediaType === 'video' ? 2 : 1,
          step: 0,
        })),
      ])

      const setItem = (key: string, patch: Partial<PendingItem>) =>
        setPending((prev) =>
          prev.map((p) => (p.key === key ? { ...p, ...patch } : p)),
        )

      // 계획 단계 — 비디오 변환 필요 여부를 미리 probe 해 구간 수(분모)를 고정.
      const willTranscode = new Map<string, boolean>()
      for (const job of jobs) {
        let t = false
        if (job.mediaType === 'video') {
          try {
            t = await needsVideoTranscode(job.file)
          } catch {
            t = false
          }
        }
        willTranscode.set(job.key, t)
        setItem(job.key, { segments: t ? 2 : 1 })
      }

      for (const job of jobs) {
        const transcode = willTranscode.get(job.key) ?? false
        let toUpload: File = job.file
        let finalName = job.file.name
        let finalMime =
          job.mediaType === 'lyrics'
            ? 'application/octet-stream'
            : job.file.type

        if (transcode) {
          const trailerBytes = await extractSamiTrailerBytes(job.file).catch(
            () => null,
          )
          setItem(job.key, { phase: 'transcoding', progress: 0, step: 0 })
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

        setItem(job.key, {
          phase: 'uploading',
          progress: 0,
          step: transcode ? 1 : 0,
        })
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
          // 성공은 제거 대신 done 마크 — 요약 셀의 전체/진행률 계산 유지.
          setItem(job.key, { phase: 'done', progress: 100 })
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
        mediaAssetId: asset.id,
      })
      close()
    },
    [assets, onPlay, close],
  )

  const handlePlayFavorite = useCallback(
    (item: FavoriteItem) => {
      onPlay({
        url: item.blobUrl,
        name: item.name,
        mediaType: item.mediaType,
        lrcUrl: item.lrcUrl,
        mediaAssetId: item.mediaAssetId,
      })
      close()
    },
    [onPlay, close],
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

  const uploadingNow = pending.some(isUploadActive)
  const errorItems = pending.filter((p) => p.phase === 'error')
  const isEmpty =
    !loading &&
    folders.length === 0 &&
    assets.length === 0 &&
    !uploadingNow &&
    errorItems.length === 0

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

        {/* Tabs — 최근 / 폴더 / 즐겨찾기 */}
        <div className="border-b border-border px-4 pt-1">
          <LibraryTabs active={tab} onChange={setTab} />
        </div>

        {tab === 'recent' && (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            <RecentPlaybackList
              rows={recent}
              error={recentError}
              resolvingId={resolvingId}
              playingFileName={playingFileName}
              onPlay={playRecent}
            />
          </div>
        )}

        {tab === 'favorites' && (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            <FavoritesList
              items={favItems}
              loaded={favLoaded}
              playingFileName={playingFileName}
              onPlay={handlePlayFavorite}
              onRemove={removeFavorite}
              onReorder={reorderFavorites}
            />
          </div>
        )}

        {tab === 'folders' && (
          <>
        {/* Breadcrumb + 우측 "..." 메뉴(폴더 추가 / 파일 업로드) */}
        <div className="flex items-center gap-1 px-4">
          <div className="min-w-0 flex-1">
            <BreadcrumbChips crumbs={breadcrumb} onSelect={setCurrentFolderId} />
          </div>
          <LibraryActionsMenu
            onCreateFolder={() => setFolderDialogOpen(true)}
            onUpload={() => fileInputRef.current?.click()}
          />
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
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                비어 있습니다.
                <br />
                화면 위쪽 "…" 메뉴의 '파일 업로드'를 사용하여 학습할 컨텐츠를
                업로드 하세요.
              </p>
            </div>
          ) : (
            <>
              {uploadingNow && (
                <div className="pt-1">
                  <UploadSummaryCell items={pending} />
                </div>
              )}

              {errorItems.length > 0 && (
                <>
                  <SectionLabel right={`${errorItems.length}개`}>
                    업로드 실패
                  </SectionLabel>
                  {errorItems.map((p) => (
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

          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*,.lrc,.mpg,.mpeg,.avi,.mkv,.flv,.wmv,.3gp"
          multiple
          className="hidden"
          onChange={onFileInputChange}
        />

        <CreateFolderDialog
          open={folderDialogOpen}
          submitting={submittingFolder}
          onClose={() => setFolderDialogOpen(false)}
          onSubmit={handleCreateFolder}
        />
      </aside>
    </div>
  )
}

