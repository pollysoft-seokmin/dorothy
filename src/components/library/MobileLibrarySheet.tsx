import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { upload } from '@vercel/blob/client'
import { ChevronRight, FileText, Film, Folder, Home, Music, Plus, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { usePlayerStore } from '~/stores/player-store'
import { useUiStore } from '~/stores/ui-store'
import { NowPlayingBars } from '~/components/library/NowPlayingBars'
import { extractSamiTrailerBytes } from '~/lib/sami-trailer'
import { transcodeToMp4 } from '~/lib/transcode'
import {
  basenameNoExt,
  detectFileMediaType,
  formatBytes,
  needsVideoTranscode,
  phaseLabel,
  type AssetItem,
  type FolderListItem,
  type FolderRow,
  type LibraryMediaType,
  type PendingItem,
} from '~/components/library/library-shared'
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

// 디자인 명세대로의 타입별 컬러 — 음악 그린, 영상 보라, 가사 앰버, 폴더 흰색.
// 같은 카라오케 쌍(오디오+가사)을 한눈에 묶어 보기 위한 시각 그룹.
const TYPE_COLOR: Record<LibraryMediaType | 'folder', string> = {
  audio: 'text-primary-bright',
  video: 'text-[#A28DFF]',
  lyrics: 'text-[#FFB75D]',
  folder: 'text-foreground',
}

const TYPE_ICON: Record<LibraryMediaType | 'folder', typeof Music> = {
  audio: Music,
  video: Film,
  lyrics: FileText,
  folder: Folder,
}

const TYPE_LABEL: Record<LibraryMediaType, string> = {
  audio: '오디오',
  video: '영상',
  lyrics: '가사',
}

// ─────────────────────────────────────────────────────────
// Inline subcomponents — 디자인 jsx 의 1:1 매핑
// ─────────────────────────────────────────────────────────

function TypeTile({
  kind,
  playing,
}: {
  kind: LibraryMediaType | 'folder'
  playing?: boolean
}) {
  const Icon = TYPE_ICON[kind]
  const color = playing ? 'text-primary-bright' : TYPE_COLOR[kind]
  return (
    <div
      className={`grid size-11 shrink-0 place-items-center rounded-lg bg-secondary ${color}`}
    >
      {playing ? <NowPlayingBars playing size={18} /> : <Icon className="size-5" />}
    </div>
  )
}

function StorageDonut({
  used,
  quota,
}: {
  used: number
  quota: number
}) {
  const ratio = quota > 0 ? Math.min(1, used / quota) : 0
  const pct = Math.round(ratio * 100)
  // conic-gradient 으로 도넛 모양 만들기 — inner mask 없이도 22px 작은 사이즈에선
  // 충분히 도넛처럼 보인다.
  const donutStyle: CSSProperties = {
    background: `conic-gradient(#1ED760 0% ${pct}%, #242424 ${pct}% 100%)`,
  }
  return (
    <div className="flex items-center gap-2 rounded-full bg-secondary py-1.5 pl-2 pr-2.5">
      <div className="size-[22px] rounded-full" style={donutStyle} />
      <span className="font-mono text-[11px] font-bold text-muted-foreground">
        {formatBytes(used)}
        <span className="text-text-dim"> / {formatBytes(quota)}</span>
      </span>
    </div>
  )
}

function BreadcrumbChips({
  crumbs,
  onSelect,
}: {
  crumbs: { id: string | null; name: string }[]
  onSelect: (id: string | null) => void
}) {
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-1 scrollbar-thin"
    >
      {crumbs.map((crumb, i) => {
        const active = i === crumbs.length - 1
        return (
          <span key={crumb.id ?? 'root'} className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSelect(crumb.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold tracking-[-0.01em] transition-colors ${
                active
                  ? 'bg-white/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {i === 0 && <Home className="size-[13px]" />}
              {crumb.name}
            </button>
            {!active && (
              <span className="text-[13px] text-text-dim" aria-hidden>
                /
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}

function SectionLabel({
  children,
  right,
}: {
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between pb-1.5 pt-3.5">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-dim">
        {children}
      </div>
      {right && <div className="text-[11px] text-text-dim">{right}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Main sheet
// ─────────────────────────────────────────────────────────

export function MobileLibrarySheet({ userId, onPlay }: Props) {
  const isOpen = useUiStore((s) => s.isMobileLibraryOpen)
  const close = useUiStore((s) => s.closeMobileLibrary)

  // 현재 재생 row 강조용 — MediaLibrary와 동일한 패턴.
  const playingFileName = usePlayerStore((s) => s.fileName)
  const playStatus = usePlayerStore((s) => s.status)

  // 라이브러리 상태 — MediaLibrary의 슬라이스를 사실상 복제한다. 추후 useLibrary
  // 훅으로 추출해 데스크톱과 한 곳에서 관리하는 후속 작업 권장.
  const [tree, setTree] = useState<FolderRow[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<FolderListItem[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [usage, setUsage] = useState({ used: 0, quota: 1 })
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<PendingItem[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [submittingFolder, setSubmittingFolder] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newNameInputRef = useRef<HTMLInputElement>(null)

  // refresh helpers
  const refreshTree = useCallback(async () => {
    const rows = await getFolderTree()
    setTree(rows as FolderRow[])
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

  // 시트가 열릴 때만 초기 fetch. 같은 폴더에 다시 들어와도 최신 상태로 갱신.
  useEffect(() => {
    if (!isOpen) return
    refreshTree()
    refreshUsage()
  }, [isOpen, refreshTree, refreshUsage])

  useEffect(() => {
    if (!isOpen) return
    refreshContents(currentFolderId)
  }, [isOpen, currentFolderId, refreshContents])

  // ESC + 모바일 폭 한정 body 스크롤 잠금 — MobileAccountSheet와 동일 패턴.
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

  // 폴더 생성 모드 진입 시 input 포커스
  useEffect(() => {
    if (creating) newNameInputRef.current?.focus()
  }, [creating])

  const breadcrumb = useMemo(() => {
    const map = new Map(tree.map((f) => [f.id, f]))
    const path: { id: string | null; name: string }[] = [{ id: null, name: '홈' }]
    let cur: FolderRow | undefined = currentFolderId
      ? map.get(currentFolderId)
      : undefined
    const chain: FolderRow[] = []
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

  // 업로드 — MediaLibrary의 startUpload와 동일 파이프라인. preparing → (video)
  // transcoding → uploading → confirmUpload. SAMI trailer 보존도 동일.
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

  // 드래그 앤 드롭 — 시트 body 전체를 드롭 영역으로
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
  const totalPending = pendingHere.length
  const completePending = 0 // pending에 들어와 있다는 것 자체가 미완료 — 표시용
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
      {/* Backdrop */}
      <button
        type="button"
        onClick={close}
        aria-label="닫기"
        tabIndex={isOpen ? 0 : -1}
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="내 미디어"
        className={`absolute bottom-0 left-0 right-0 flex h-[88vh] max-h-[760px] flex-col rounded-t-[20px] bg-card text-foreground shadow-[0_-20px_50px_rgba(0,0,0,0.6)] transition-transform duration-250 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-white/25" />
        </div>

        {/* Header — title + storage donut + close */}
        <div className="flex items-center justify-between gap-2 px-5 pb-1 pt-2.5">
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">
            내 미디어
          </h2>
          <div className="flex items-center gap-2">
            <StorageDonut used={usage.used} quota={usage.quota} />
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/15 cursor-pointer"
            >
              <X className="size-[18px]" />
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="px-4 pt-1">
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
            <EmptyDropZone
              onPickFiles={() => fileInputRef.current?.click()}
            />
          ) : (
            <>
              {pendingHere.length > 0 && (
                <>
                  <SectionLabel
                    right={`${completePending} / ${totalPending} 완료`}
                  >
                    업로드 중
                  </SectionLabel>
                  {pendingHere.map((p) => (
                    <PendingRow key={p.key} row={p} />
                  ))}
                </>
              )}

              {folders.length > 0 && (
                <>
                  <SectionLabel right={`${folders.length}`}>폴더</SectionLabel>
                  {folders.map((f) => (
                    <FolderRowCmp
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

        {/* Action bar — regular / creating morph */}
        {creating ? (
          <div className="flex items-center gap-2 border-t border-border bg-card px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <input
              ref={newNameInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setNewName('')
                }
              }}
              placeholder="새 폴더 이름"
              className="h-11 flex-1 rounded-full border border-primary-bright bg-accent px-4 text-sm font-semibold text-foreground placeholder:text-text-dim focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCreateFolder}
              disabled={submittingFolder || !newName.trim()}
              className="h-11 cursor-pointer rounded-full bg-primary-bright px-5 text-sm font-extrabold text-background disabled:opacity-50"
            >
              만들기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_1.4fr] gap-2.5 border-t border-border bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 text-sm font-extrabold text-foreground hover:bg-white/5"
            >
              <Plus className="size-4" />
              폴더
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary-bright text-sm font-extrabold text-background shadow-[0_4px_14px_rgba(29,215,96,0.3)] hover:bg-primary"
            >
              <Upload className="size-4" />
              업로드
            </button>
          </div>
        )}

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
// Rows
// ─────────────────────────────────────────────────────────

function FolderRowCmp({
  name,
  onClick,
}: {
  name: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded px-1 py-2.5 hover:bg-white/[0.04] cursor-pointer"
    >
      <TypeTile kind="folder" />
      <div className="min-w-0 flex-1 text-left">
        <div className="truncate text-[15px] font-bold tracking-[-0.01em] text-foreground">
          {name}
        </div>
        <div className="mt-0.5 text-xs text-text-dim">폴더</div>
      </div>
      <ChevronRight className="size-[14px] shrink-0 text-text-dim" />
    </button>
  )
}

function AssetRow({
  asset,
  active,
  playing,
  onClick,
}: {
  asset: AssetItem
  active: boolean
  playing: boolean
  onClick: () => void
}) {
  const kind = (asset.mediaType === 'lyrics'
    ? 'lyrics'
    : asset.mediaType === 'video'
      ? 'video'
      : 'audio') as LibraryMediaType
  const isLyrics = kind === 'lyrics'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLyrics}
      className={`flex w-full items-center gap-3.5 rounded px-1 py-2.5 text-left ${
        isLyrics ? 'cursor-default' : 'cursor-pointer hover:bg-white/[0.04]'
      }`}
    >
      <TypeTile kind={kind} playing={playing} />
      <div className="min-w-0 flex-1">
        <div
          className={`truncate text-[15px] font-bold tracking-[-0.01em] ${
            active ? 'text-primary-bright' : 'text-foreground'
          }`}
          title={asset.name}
        >
          {asset.name}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-dim">
          <span>{TYPE_LABEL[kind]}</span>
          <span>·</span>
          <span className="font-mono">{formatBytes(asset.sizeBytes)}</span>
        </div>
      </div>
    </button>
  )
}

function PendingRow({ row }: { row: PendingItem }) {
  const kind = row.mediaType
  const isError = row.phase === 'error'
  return (
    <div className="flex items-center gap-3.5 px-1 py-2.5">
      <TypeTile kind={kind} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-bold tracking-[-0.01em] text-muted-foreground">
          {row.name}
        </div>
        <div
          className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${
            isError ? 'text-destructive' : 'text-primary-bright'
          }`}
        >
          <span>{phaseLabel(row.phase)}</span>
          {!isError && row.phase !== 'preparing' && (
            <span className="font-mono">{Math.round(row.progress)}%</span>
          )}
          {isError && row.errorMessage && (
            <span className="truncate text-text-dim">· {row.errorMessage}</span>
          )}
        </div>
        {!isError && (
          <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-primary-bright transition-[width] duration-200"
              style={{ width: `${row.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Empty state (folder is empty)
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
