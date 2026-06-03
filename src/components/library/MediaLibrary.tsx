import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { MoreHorizontal, Search } from 'lucide-react'
import { toast } from 'sonner'
import { usePlayerStore } from '~/stores/player-store'
import { extractSamiTrailerBytes } from '~/lib/sami-trailer'
import { transcodeToMp4 } from '~/lib/transcode'
import {
  basenameNoExt,
  detectFileMediaType,
  formatBytes,
  isUploadActive,
  needsVideoTranscode,
  resolveUploadMime,
  type AssetItem,
  type FavoriteItem,
  type FolderListItem,
  type FolderRow,
  type LibraryMediaType,
  type PendingItem,
} from '~/components/library/library-shared'
import {
  AssetRow as AssetRowAtom,
  BreadcrumbChips,
  CreateFolderDialog,
  FavoritesList,
  FolderRow as FolderRowAtom,
  LibraryActionsMenu,
  LibraryEmptyDropZone,
  LibraryTabs,
  PendingRow,
  RecentPlaybackList,
  SectionLabel,
  UploadSummaryCell,
  type LibraryTab,
} from '~/components/library/library-atoms'
import { useFavoritesStore } from '~/stores/favorites-store'
import {
  entriesFromDataTransfer,
  entriesFromInput,
  type UploadEntry,
} from '~/lib/folder-upload'
import { useRecentPlaybacks } from '~/hooks/useRecentPlaybacks'
import {
  createFolder,
  deleteAsset,
  deleteFolder,
  getFolderTree,
  getStorageUsage,
  listFolderContents,
  confirmUpload,
  ensureFolderPath,
  renameAsset,
  renameFolder,
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

// Inline rename row — 이름 편집 중인 폴더/파일 자리에 들어가는 컨트롤.
// 디자인 v2 의 row 외관과 유사하게 작은 input + 저장/취소.
function RenameRow({
  initialName,
  onSubmit,
  onCancel,
  submitting,
}: {
  initialName: string
  onSubmit: (name: string) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [v, setV] = useState(initialName)
  return (
    <div className="flex items-center gap-2 px-2 py-2">
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit(v.trim())
          if (e.key === 'Escape') onCancel()
        }}
        className="h-9 flex-1 rounded-md border border-primary-bright bg-accent px-3 text-[13px] font-semibold text-foreground placeholder:text-text-dim focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onSubmit(v.trim())}
        disabled={submitting || !v.trim()}
        className="h-9 cursor-pointer rounded-md bg-primary-bright px-3 text-[12px] font-extrabold text-background disabled:opacity-50"
      >
        저장
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-text-dim hover:text-foreground cursor-pointer"
      >
        취소
      </button>
    </div>
  )
}

function RowActionsMenu({
  onRename,
  onDelete,
  ariaLabel,
}: {
  onRename: () => void
  onDelete: () => void
  ariaLabel: string
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="grid size-6 shrink-0 cursor-pointer place-items-center rounded-full text-text-dim opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 hover:text-foreground"
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[8rem] rounded-md border bg-popover py-1 shadow-md"
        >
          <DropdownMenu.Item
            className="cursor-pointer px-3 py-1.5 text-sm outline-none data-[highlighted]:bg-accent"
            onSelect={onRename}
          >
            이름변경
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="cursor-pointer px-3 py-1.5 text-sm text-destructive outline-none data-[highlighted]:bg-accent"
            onSelect={onDelete}
          >
            삭제
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function MediaLibrary({ userId, onPlay }: Props) {
  const [tab, setTab] = useState<LibraryTab>('folders')
  const [tree, setTree] = useState<FolderRow[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<FolderListItem[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [usage, setUsage] = useState<Usage>({
    used: 0,
    quota: 1,
    byType: { audio: 0, video: 0, lyrics: 0 },
  })
  const [loading, setLoading] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [submittingFolder, setSubmittingFolder] = useState(false)
  const [editing, setEditing] = useState<
    | { kind: 'folder' | 'asset'; id: string; name: string }
    | null
  >(null)
  const [submittingRename, setSubmittingRename] = useState(false)
  const [pending, setPending] = useState<PendingItem[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const playingFileName = usePlayerStore((s) => s.fileName)
  const playStatus = usePlayerStore((s) => s.status)

  const favItems = useFavoritesStore((s) => s.items)
  const favLoaded = useFavoritesStore((s) => s.loaded)
  const loadFavorites = useFavoritesStore((s) => s.load)
  const removeFavorite = useFavoritesStore((s) => s.toggle)
  const reorderFavorites = useFavoritesStore((s) => s.reorder)

  // 최근 탭이 보일 때만 fetch. 라이브러리가 player 트리에 있어 resolve 결과를
  // onPlay 로 바로 위임한다 (ui-store playRequest 우회 불필요, #105).
  const {
    recent,
    error: recentError,
    resolvingId,
    playRecent,
  } = useRecentPlaybacks({ active: tab === 'recent', onResolved: onPlay })

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

  useEffect(() => {
    refreshTree()
    refreshUsage()
  }, [refreshTree, refreshUsage])

  useEffect(() => {
    refreshContents(currentFolderId)
  }, [currentFolderId, refreshContents])

  // 즐겨찾기 탭 진입 시 목록 로드(최초 1회, 이후 store 가 단일 소스로 유지).
  useEffect(() => {
    if (tab === 'favorites') void loadFavorites()
  }, [tab, loadFavorites])

  // 배치가 모두 끝나면(활성 0) 성공(done) 항목을 정리해 요약 셀을 사라지게 한다.
  // 실패(error) 항목은 닫기 전까지 행으로 남긴다.
  useEffect(() => {
    if (pending.length === 0) return
    if (pending.some(isUploadActive)) return
    if (pending.some((p) => p.phase === 'done')) {
      setPending((prev) => prev.filter((p) => p.phase !== 'done'))
    }
  }, [pending])

  // 폴더 선택 input 에 webkitdirectory/directory 부착 — 표준 input 타입에 없어
  // JSX 속성으로 두면 타입 에러라 마운트 후 DOM 에 직접 설정한다.
  useEffect(() => {
    const el = folderInputRef.current
    if (!el) return
    el.setAttribute('webkitdirectory', '')
    el.setAttribute('directory', '')
  }, [])

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
    [currentFolderId, refreshTree, refreshContents, submittingFolder],
  )

  const handleSubmitRename = useCallback(
    async (trimmed: string) => {
      if (!editing || submittingRename || !trimmed) return
      setSubmittingRename(true)
      try {
        if (editing.kind === 'folder') {
          await renameFolder({ data: { id: editing.id, name: trimmed } })
          await refreshTree()
        } else {
          await renameAsset({ data: { id: editing.id, name: trimmed } })
        }
        setEditing(null)
        await refreshContents(currentFolderId)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '이름 변경 실패')
      } finally {
        setSubmittingRename(false)
      }
    },
    [editing, submittingRename, currentFolderId, refreshTree, refreshContents],
  )

  const handleDeleteFolder = useCallback(
    async (id: string, name: string) => {
      if (
        !confirm(
          `"${name}" 폴더를 삭제할까요?\n안의 모든 하위 폴더와 파일이 함께 삭제됩니다.`,
        )
      )
        return
      try {
        await deleteFolder({ data: { id } })
        await refreshTree()
        await refreshContents(currentFolderId)
        await refreshUsage()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '폴더 삭제 실패')
      }
    },
    [currentFolderId, refreshTree, refreshContents, refreshUsage],
  )

  const handleDeleteAsset = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`"${name}"을(를) 삭제할까요?`)) return
      try {
        await deleteAsset({ data: { id } })
        await refreshContents(currentFolderId)
        await refreshUsage()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '파일 삭제 실패')
      }
    },
    [currentFolderId, refreshContents, refreshUsage],
  )

  // 업로드 코어 — entries 는 {file, relPath(폴더 세그먼트)} 목록. 평면 업로드는
  // relPath=[] 로 들어오고, 폴더 업로드/드롭은 relPath 가 채워져 있다. baseFolderId
  // 는 드롭/선택한 위치(보통 현재 폴더). 고유 relPath 마다 ensureFolderPath 를 한 번
  // 호출해 폴더를 만들고, 각 파일을 해석된 folderId 로 업로드한다.
  const runUpload = useCallback(
    async (entries: UploadEntry[], baseFolderId: string | null) => {
      const acceptable = entries
        .map((e) => ({ ...e, mediaType: detectFileMediaType(e.file) }))
        .filter(
          (c): c is UploadEntry & { mediaType: LibraryMediaType } =>
            c.mediaType !== null,
        )
      const rejected = entries.length - acceptable.length
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

      // 고유 폴더 경로마다 ensureFolderPath 1회 → pathKey→folderId 캐시.
      const pathKey = (segs: string[]) => segs.join(' ')
      const folderIdByPath = new Map<string, string | null>([['', baseFolderId]])
      const uniquePaths = new Map<string, string[]>()
      for (const c of acceptable) {
        if (c.relPath.length > 0) uniquePaths.set(pathKey(c.relPath), c.relPath)
      }
      let foldersTouched = false
      for (const [key, segs] of uniquePaths) {
        try {
          const { folderId } = await ensureFolderPath({
            data: { parentId: baseFolderId, segments: segs },
          })
          folderIdByPath.set(key, folderId)
          foldersTouched = true
        } catch {
          toast.error(`폴더 생성 실패: ${segs.join('/')}`)
          // 매핑 미설정 → 해당 경로 파일은 아래에서 건너뛴다.
        }
      }
      if (foldersTouched) {
        await refreshTree()
        await refreshContents(baseFolderId)
      }

      const jobs = acceptable
        .map(({ file, mediaType, relPath }) => {
          const key = relPath.length > 0 ? pathKey(relPath) : ''
          if (!folderIdByPath.has(key)) return null
          return {
            key: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
            file,
            mediaType,
            targetFolderId: folderIdByPath.get(key) ?? null,
          }
        })
        .filter(
          (j): j is {
            key: string
            file: File
            mediaType: LibraryMediaType
            targetFolderId: string | null
          } => j !== null,
        )
      if (jobs.length === 0) return

      // 진행 표시는 드롭/선택한 위치(baseFolderId)에 모아 보여준다 — 하위 폴더로
      // 들어가는 파일도 사용자가 작업한 화면에서 진행률이 보이게.
      setPending((prev) => [
        ...prev,
        ...jobs.map<PendingItem>((j) => ({
          key: j.key,
          name: j.file.name,
          mediaType: j.mediaType,
          folderId: baseFolderId,
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
            : resolveUploadMime(job.file, job.mediaType)

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
              folderId: job.targetFolderId,
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
              folderId: job.targetFolderId,
            },
          })
          // 성공 항목은 제거하지 않고 done 마크 — 요약 셀의 전체/진행률 계산을
          // 유지한다. 활성이 0이 되면 아래 effect 가 done 항목을 정리한다.
          setItem(job.key, { phase: 'done', progress: 100 })
          await refreshContents(baseFolderId)
          await refreshUsage()
        } catch (e) {
          const msg = e instanceof Error ? e.message : '업로드 실패'
          setItem(job.key, { phase: 'error', errorMessage: msg })
          toast.error(`${job.file.name}: ${msg}`)
        }
      }
    },
    [userId, usage, refreshContents, refreshUsage, refreshTree],
  )

  const dismissPending = useCallback((key: string) => {
    setPending((prev) => prev.filter((p) => p.key !== key))
  }, [])

  // 파일 선택 / 폴더 선택(webkitdirectory) 공통 — entriesFromInput 이 폴더 선택 시
  // webkitRelativePath 로 구조를 복원한다.
  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) void runUpload(entriesFromInput(files), currentFolderId)
      e.target.value = ''
    },
    [runUpload, currentFolderId],
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
    },
    [assets, onPlay],
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
    },
    [onPlay],
  )

  // ── Drag & drop on the whole pane ─────────────────────────
  const onPaneDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    setDragActive(true)
  }, [])
  const onPaneDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    setDragActive(false)
    setDragOverFolderId(null)
  }, [])
  const onPaneDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragActive(false)
      setDragOverFolderId(null)
      // entriesFromDataTransfer 가 폴더 트리를 순회해 구조를 보존한다(평면 파일은
      // relPath=[]). items 는 핸들러 종료 후 무효화되므로 즉시 전달.
      void entriesFromDataTransfer(e.dataTransfer).then((entries) => {
        if (entries.length > 0) void runUpload(entries, currentFolderId)
      })
    },
    [runUpload, currentFolderId],
  )

  // 업로드 상태는 폴더와 무관하게 전역으로 요약한다(드롭 위치/탐색과 분리).
  const uploadingNow = pending.some(isUploadActive)
  const errorItems = pending.filter((p) => p.phase === 'error')
  const isInitialEmpty =
    loading &&
    folders.length === 0 &&
    assets.length === 0 &&
    !uploadingNow &&
    errorItems.length === 0
  const isEmpty =
    !loading &&
    folders.length === 0 &&
    assets.length === 0 &&
    !uploadingNow &&
    errorItems.length === 0

  return (
    <div
      className={`relative flex h-full flex-col overflow-hidden text-foreground transition-colors ${
        dragActive ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''
      }`}
      onDragOver={onPaneDragOver}
      onDragEnter={onPaneDragOver}
      onDragLeave={onPaneDragLeave}
      onDrop={onPaneDrop}
    >
      {/* Header — 제목 + Search placeholder. 아이콘은 타이틀바의 토글 버튼으로
          이동해 패널 헤더에선 제거 (#100). */}
      <div className="flex items-center justify-between px-[18px] pt-[18px]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base font-extrabold tracking-[-0.02em]">
            내 미디어
          </h2>
        </div>
        <button
          type="button"
          aria-label="검색 (준비 중)"
          disabled
          className="grid size-7 cursor-not-allowed place-items-center rounded-md text-muted-foreground opacity-50"
        >
          <Search className="size-[15px]" />
        </button>
      </div>

      {/* Tabs — 최근 / 폴더 / 즐겨찾기 */}
      <div className="border-b border-border px-2.5 pt-1.5">
        <LibraryTabs active={tab} onChange={setTab} density="compact" />
      </div>

      {tab === 'recent' && (
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2 pt-1">
          <RecentPlaybackList
            rows={recent}
            error={recentError}
            resolvingId={resolvingId}
            playingFileName={playingFileName}
            onPlay={playRecent}
            density="compact"
          />
        </div>
      )}

      {tab === 'favorites' && (
        <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2 pt-1">
          <FavoritesList
            items={favItems}
            loaded={favLoaded}
            playingFileName={playingFileName}
            onPlay={handlePlayFavorite}
            onRemove={removeFavorite}
            onReorder={reorderFavorites}
            density="compact"
          />
        </div>
      )}

      {tab === 'folders' && (
        <>
          {/* Breadcrumb — 위/아래 16px 여백은 BreadcrumbChips(py-4)가 담당.
              우측 "..." 메뉴로 폴더 추가 / 파일 업로드 (#105). */}
          <div className="flex items-center gap-1 border-b border-border px-3.5">
            <div className="min-w-0 flex-1">
              <BreadcrumbChips
                crumbs={breadcrumb}
                onSelect={setCurrentFolderId}
                density="compact"
              />
            </div>
            <LibraryActionsMenu
              onCreateFolder={() => setFolderDialogOpen(true)}
              onUpload={() => fileInputRef.current?.click()}
              onUploadFolder={() => folderInputRef.current?.click()}
            />
          </div>

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2.5 pb-2">
        {isInitialEmpty ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            불러오는 중…
          </div>
        ) : isEmpty ? (
          <LibraryEmptyDropZone
            onPickFiles={() => fileInputRef.current?.click()}
          />
        ) : (
          <>
            {uploadingNow && (
              <div className="pt-2">
                <UploadSummaryCell items={pending} density="compact" />
              </div>
            )}

            {errorItems.length > 0 && (
              <>
                <SectionLabel density="compact" right={`${errorItems.length}개`}>
                  업로드 실패
                </SectionLabel>
                {errorItems.map((p) => (
                  <PendingRow
                    key={p.key}
                    row={p}
                    density="compact"
                    onDismiss={() => dismissPending(p.key)}
                  />
                ))}
              </>
            )}

            {folders.length > 0 && (
              <>
                <SectionLabel density="compact" right={`${folders.length}`}>
                  폴더
                </SectionLabel>
                {folders.map((f) => {
                  const isEditing = editing?.kind === 'folder' && editing.id === f.id
                  const isDropTarget = dragOverFolderId === f.id
                  if (isEditing) {
                    return (
                      <RenameRow
                        key={f.id}
                        initialName={f.name}
                        onSubmit={(name) => handleSubmitRename(name)}
                        onCancel={() => setEditing(null)}
                        submitting={submittingRename}
                      />
                    )
                  }
                  return (
                    <div
                      key={f.id}
                      className={
                        isDropTarget
                          ? 'rounded-md ring-1 ring-primary'
                          : undefined
                      }
                      onDragOver={(e) => {
                        if (!Array.from(e.dataTransfer.types).includes('Files'))
                          return
                        e.preventDefault()
                        e.stopPropagation()
                        setDragActive(true)
                        setDragOverFolderId(f.id)
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node | null))
                          return
                        setDragOverFolderId((cur) => (cur === f.id ? null : cur))
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setDragActive(false)
                        setDragOverFolderId(null)
                        // 폴더 행에 드롭 → 그 폴더를 base 로 구조 보존 업로드.
                        void entriesFromDataTransfer(e.dataTransfer).then(
                          (entries) => {
                            if (entries.length > 0) void runUpload(entries, f.id)
                          },
                        )
                      }}
                    >
                      <FolderRowAtom
                        name={f.name}
                        density="compact"
                        onClick={() => setCurrentFolderId(f.id)}
                        actions={
                          <RowActionsMenu
                            ariaLabel={`${f.name} 폴더 작업 메뉴`}
                            onRename={() =>
                              setEditing({ kind: 'folder', id: f.id, name: f.name })
                            }
                            onDelete={() => handleDeleteFolder(f.id, f.name)}
                          />
                        }
                      />
                    </div>
                  )
                })}
              </>
            )}

            {assets.length > 0 && (
              <>
                <SectionLabel density="compact" right={`${assets.length}`}>
                  파일
                </SectionLabel>
                {assets.map((a) => {
                  const isEditing = editing?.kind === 'asset' && editing.id === a.id
                  if (isEditing) {
                    return (
                      <RenameRow
                        key={a.id}
                        initialName={a.name}
                        onSubmit={(name) => handleSubmitRename(name)}
                        onCancel={() => setEditing(null)}
                        submitting={submittingRename}
                      />
                    )
                  }
                  const isPlaying =
                    a.mediaType !== 'lyrics' &&
                    a.name === playingFileName &&
                    playStatus === 'playing'
                  const isActive =
                    a.mediaType !== 'lyrics' && a.name === playingFileName
                  return (
                    <AssetRowAtom
                      key={a.id}
                      asset={a}
                      active={isActive}
                      playing={isPlaying}
                      density="compact"
                      onClick={() => {
                        if (a.mediaType === 'lyrics') return
                        handlePlay(a)
                      }}
                      actions={
                        <RowActionsMenu
                          ariaLabel={`${a.name} 작업 메뉴`}
                          onRename={() =>
                            setEditing({ kind: 'asset', id: a.id, name: a.name })
                          }
                          onDelete={() => handleDeleteAsset(a.id, a.name)}
                        />
                      }
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
        hidden
        onChange={onFileInputChange}
      />

      {/* 폴더 업로드 — webkitdirectory/directory 는 표준 타입에 없어 ref 로 부착.
          accept 는 디렉터리 선택과 함께 쓰면 일부 브라우저가 무시하므로 생략하고,
          지원 형식 필터링은 detectFileMediaType 가 담당한다. */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        hidden
        onChange={onFileInputChange}
      />

      <CreateFolderDialog
        open={folderDialogOpen}
        submitting={submittingFolder}
        onClose={() => setFolderDialogOpen(false)}
        onSubmit={handleCreateFolder}
      />
    </div>
  )
}
