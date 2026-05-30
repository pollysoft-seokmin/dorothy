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
  needsVideoTranscode,
  type AssetItem,
  type FolderListItem,
  type FolderRow,
  type LibraryMediaType,
  type PendingItem,
} from '~/components/library/library-shared'
import {
  AssetRow as AssetRowAtom,
  BreadcrumbChips,
  CreateFolderDialog,
  FavoritesEmpty,
  FolderRow as FolderRowAtom,
  LibraryActionsMenu,
  LibraryEmptyDropZone,
  LibraryTabs,
  PendingRow,
  RecentPlaybackList,
  SectionLabel,
  type LibraryTab,
} from '~/components/library/library-atoms'
import { useRecentPlaybacks } from '~/hooks/useRecentPlaybacks'
import {
  createFolder,
  deleteAsset,
  deleteFolder,
  getFolderTree,
  getStorageUsage,
  listFolderContents,
  confirmUpload,
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

  const playingFileName = usePlayerStore((s) => s.fileName)
  const playStatus = usePlayerStore((s) => s.status)

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

  const dismissPending = useCallback((key: string) => {
    setPending((prev) => prev.filter((p) => p.key !== key))
  }, [])

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
    },
    [assets, onPlay],
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
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) startUpload(files, currentFolderId)
    },
    [startUpload, currentFolderId],
  )

  const pendingHere = pending.filter((p) => p.folderId === currentFolderId)
  const isInitialEmpty =
    loading &&
    folders.length === 0 &&
    assets.length === 0 &&
    pendingHere.length === 0
  const isEmpty =
    !loading &&
    folders.length === 0 &&
    assets.length === 0 &&
    pendingHere.length === 0

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
        <div className="flex-1 min-h-0 overflow-y-auto">
          <FavoritesEmpty />
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
            {pendingHere.length > 0 && (
              <>
                <SectionLabel density="compact" right={`${pendingHere.length}개`}>
                  업로드 중
                </SectionLabel>
                {pendingHere.map((p) => (
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
                        const files = Array.from(e.dataTransfer.files)
                        if (files.length > 0) startUpload(files, f.id)
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

      <CreateFolderDialog
        open={folderDialogOpen}
        submitting={submittingFolder}
        onClose={() => setFolderDialogOpen(false)}
        onSubmit={handleCreateFolder}
      />
    </div>
  )
}
