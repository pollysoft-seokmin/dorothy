import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { upload } from '@vercel/blob/client'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { FileText, Film, Folder, MoreHorizontal, Music } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { probeVideoPlayable, transcodeToMp4 } from '~/lib/transcode'
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

const ALWAYS_TRANSCODE_EXTS = new Set([
  'mpg',
  'mpeg',
  'avi',
  'mkv',
  'flv',
  'wmv',
  '3gp',
])

function getExt(name: string): string {
  return name.toLowerCase().split('.').pop() ?? ''
}

async function needsVideoTranscode(file: File): Promise<boolean> {
  if (!file.type.startsWith('video/')) return false
  if (ALWAYS_TRANSCODE_EXTS.has(getExt(file.name))) return true
  return !(await probeVideoPlayable(file))
}

type FolderRow = {
  id: string
  parentId: string | null
  name: string
  createdAt: string | Date
}

type FolderListItem = { id: string; name: string; createdAt: string | Date }

type AssetItem = {
  id: string
  name: string
  mediaType: string
  mimeType: string
  sizeBytes: number
  blobUrl: string
  createdAt: string | Date
}

type LibraryMediaType = 'audio' | 'video' | 'lyrics'

function detectFileMediaType(file: File): LibraryMediaType | null {
  if (file.name.toLowerCase().endsWith('.lrc')) return 'lyrics'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

type PendingItem = {
  key: string
  name: string
  mediaType: LibraryMediaType
  phase: 'preparing' | 'transcoding' | 'uploading' | 'error'
  progress: number
  errorMessage?: string
  folderId: string | null
}

type Props = {
  userId: string
  onPlay: (params: {
    url: string
    name: string
    mediaType: 'audio' | 'video'
    lrcUrl?: string
  }) => void
}

function basenameNoExt(name: string): string {
  const lastDot = name.lastIndexOf('.')
  return (lastDot > 0 ? name.slice(0, lastDot) : name).toLowerCase()
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
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
          className="shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 px-1.5 py-0.5 rounded text-muted-foreground hover:bg-muted-foreground/15 hover:text-foreground"
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[8rem] bg-popover border rounded-md shadow-md py-1"
        >
          <DropdownMenu.Item
            className="px-3 py-1.5 text-sm cursor-pointer outline-none data-[highlighted]:bg-accent"
            onSelect={onRename}
          >
            이름변경
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="px-3 py-1.5 text-sm cursor-pointer outline-none text-destructive data-[highlighted]:bg-accent"
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
  const [tree, setTree] = useState<FolderRow[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<FolderListItem[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [usage, setUsage] = useState({ used: 0, quota: 1 })
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
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
    const path: FolderRow[] = []
    let cur: FolderRow | undefined = currentFolderId
      ? map.get(currentFolderId)
      : undefined
    while (cur) {
      path.unshift(cur)
      cur = cur.parentId ? map.get(cur.parentId) : undefined
    }
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
      const msg = e instanceof Error ? e.message : '폴더 생성 실패'
      toast.error(msg)
    } finally {
      setSubmittingFolder(false)
    }
  }, [newName, currentFolderId, refreshTree, refreshContents, submittingFolder])

  const handleSubmitRename = useCallback(async () => {
    if (!editing || submittingRename) return
    const trimmed = editing.name.trim()
    if (!trimmed) return
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
      const msg = e instanceof Error ? e.message : '이름 변경 실패'
      toast.error(msg)
    } finally {
      setSubmittingRename(false)
    }
  }, [editing, submittingRename, currentFolderId, refreshTree, refreshContents])

  const handleDeleteFolder = useCallback(
    async (id: string, name: string) => {
      if (!confirm(`"${name}" 폴더를 삭제할까요?\n안의 모든 하위 폴더와 파일이 함께 삭제됩니다.`)) {
        return
      }
      try {
        await deleteFolder({ data: { id } })
        await refreshTree()
        await refreshContents(currentFolderId)
        await refreshUsage()
      } catch (e) {
        const msg = e instanceof Error ? e.message : '폴더 삭제 실패'
        toast.error(msg)
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
        const msg = e instanceof Error ? e.message : '파일 삭제 실패'
        toast.error(msg)
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
        // .lrc는 Vercel Blob이 text/* 계열을 거부할 수 있어 octet-stream으로
        // 강제. 서버 detectMediaType은 확장자 우선이라 영향 없음.
        let finalMime =
          job.mediaType === 'lyrics'
            ? 'application/octet-stream'
            : job.file.type

        // Phase 1: 변환 필요 여부 판단 + (필요하면) 트랜스코딩
        if (job.mediaType === 'video') {
          let need = false
          try {
            need = await needsVideoTranscode(job.file)
          } catch {
            need = false
          }
          if (need) {
            setItem(job.key, { phase: 'transcoding', progress: 0 })
            try {
              toUpload = await transcodeToMp4(job.file, ({ ratio }) => {
                setItem(job.key, { progress: ratio * 100 })
              })
              finalName = toUpload.name
              finalMime = 'video/mp4'
              setItem(job.key, { name: finalName })
            } catch (e) {
              const msg = e instanceof Error ? e.message : '변환 실패'
              setItem(job.key, {
                phase: 'error',
                errorMessage: msg,
                progress: 0,
              })
              toast.error(`${job.file.name}: 변환 실패`)
              continue
            }
          }
        }

        // Phase 2: 업로드
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
          // 성공 — pending에서 제거. refreshContents가 곧 실제 row를 채움.
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

  const onPaneDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return
    e.preventDefault()
    setDragActive(true)
  }, [])

  const onPaneDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // 자식으로 이동하는 경우는 무시 (relatedTarget이 pane 내부)
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
      setDragActive(false)
      setDragOverFolderId(null)
    },
    [],
  )

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

  const usageRatio = Math.min(1, usage.used / usage.quota)
  const pendingHere = pending.filter((p) => p.folderId === currentFolderId)

  return (
    <div
      className={`relative flex flex-col h-full overflow-hidden transition-colors ${
        dragActive ? 'bg-primary/5 ring-2 ring-primary ring-inset' : ''
      }`}
      onDragOver={onPaneDragOver}
      onDragEnter={onPaneDragOver}
      onDragLeave={onPaneDragLeave}
      onDrop={onPaneDrop}
    >
      <header className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">내 미디어</h2>
          <span className="text-xs text-muted-foreground">
            {formatBytes(usage.used)} / {formatBytes(usage.quota)}
          </span>
        </div>
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              usageRatio > 0.9 ? 'bg-destructive' : 'bg-primary'
            }`}
            style={{ width: `${usageRatio * 100}%` }}
          />
        </div>
      </header>

      <nav className="px-4 py-2 border-b flex items-center gap-1 text-sm overflow-x-auto">
        <button
          className={`hover:underline ${currentFolderId === null ? 'font-semibold' : ''}`}
          onClick={() => setCurrentFolderId(null)}
        >
          홈
        </button>
        {breadcrumb.map((f) => (
          <span key={f.id} className="flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            <button
              className={`hover:underline ${
                currentFolderId === f.id ? 'font-semibold' : ''
              }`}
              onClick={() => setCurrentFolderId(f.id)}
            >
              {f.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="px-4 py-2 border-b flex items-center gap-2">
        {creating ? (
          <>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setNewName('')
                }
              }}
              placeholder="폴더 이름"
              className="flex-1 px-2 py-1 text-sm border rounded"
            />
            <Button size="sm" onClick={handleCreateFolder} disabled={submittingFolder}>
              만들기
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false)
                setNewName('')
              }}
            >
              취소
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
              + 폴더
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              ↑ 업로드
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*,.lrc"
              multiple
              hidden
              onChange={onFileInputChange}
            />
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading &&
        folders.length === 0 &&
        assets.length === 0 &&
        pendingHere.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            불러오는 중...
          </div>
        ) : folders.length === 0 &&
          assets.length === 0 &&
          pendingHere.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            비어 있습니다. 우측 상단 "+ 폴더" 또는 "↑ 업로드"로 시작하거나, 이
            영역에 파일을 드래그&드롭하세요.
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {folders.map((f) => {
              const isEditing = editing?.kind === 'folder' && editing.id === f.id
              const isDropTarget = dragOverFolderId === f.id
              return (
                <li
                  key={f.id}
                  className={`group flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                    isDropTarget
                      ? 'bg-primary/15 ring-1 ring-primary'
                      : 'hover:bg-muted'
                  }`}
                  onDragOver={(e) => {
                    if (!Array.from(e.dataTransfer.types).includes('Files')) return
                    e.preventDefault()
                    e.stopPropagation()
                    setDragActive(true)
                    setDragOverFolderId(f.id)
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
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
                  <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) =>
                          setEditing({ ...editing, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSubmitRename()
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        className="flex-1 px-2 py-0.5 text-sm border rounded"
                      />
                      <button
                        className="text-xs hover:underline"
                        onClick={handleSubmitRename}
                        disabled={submittingRename}
                      >
                        저장
                      </button>
                      <button
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => setEditing(null)}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="flex-1 text-left text-sm truncate"
                        onClick={() => setCurrentFolderId(f.id)}
                        title={f.name}
                      >
                        {f.name}
                      </button>
                      <RowActionsMenu
                        ariaLabel={`${f.name} 폴더 작업 메뉴`}
                        onRename={() =>
                          setEditing({ kind: 'folder', id: f.id, name: f.name })
                        }
                        onDelete={() => handleDeleteFolder(f.id, f.name)}
                      />
                    </>
                  )}
                </li>
              )
            })}
            {assets.map((a) => {
              const isEditing = editing?.kind === 'asset' && editing.id === a.id
              return (
                <li
                  key={a.id}
                  className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted"
                >
                  {a.mediaType === 'video' ? (
                    <Film className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : a.mediaType === 'lyrics' ? (
                    <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : (
                    <Music className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  )}
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) =>
                          setEditing({ ...editing, name: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSubmitRename()
                          if (e.key === 'Escape') setEditing(null)
                        }}
                        className="flex-1 px-2 py-0.5 text-sm border rounded min-w-0"
                      />
                      <button
                        className="text-xs hover:underline"
                        onClick={handleSubmitRename}
                        disabled={submittingRename}
                      >
                        저장
                      </button>
                      <button
                        className="text-xs text-muted-foreground hover:underline"
                        onClick={() => setEditing(null)}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      {a.mediaType === 'lyrics' ? (
                        <span
                          className="flex-1 text-left text-sm truncate min-w-0"
                          title={a.name}
                        >
                          {a.name}
                        </span>
                      ) : (
                        <button
                          className="flex-1 text-left text-sm truncate min-w-0"
                          onClick={() => {
                            const stem = basenameNoExt(a.name)
                            const sibling = assets.find(
                              (s) =>
                                s.mediaType === 'lyrics' &&
                                basenameNoExt(s.name) === stem,
                            )
                            onPlay({
                              url: a.blobUrl,
                              name: a.name,
                              mediaType: a.mediaType === 'video' ? 'video' : 'audio',
                              lrcUrl: sibling?.blobUrl,
                            })
                          }}
                          title={a.name}
                        >
                          {a.name}
                        </button>
                      )}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatBytes(a.sizeBytes)}
                      </span>
                      <RowActionsMenu
                        ariaLabel={`${a.name} 작업 메뉴`}
                        onRename={() =>
                          setEditing({ kind: 'asset', id: a.id, name: a.name })
                        }
                        onDelete={() => handleDeleteAsset(a.id, a.name)}
                      />
                    </>
                  )}
                </li>
              )
            })}
            {pendingHere.map((p) => {
              const phaseLabel =
                p.phase === 'preparing'
                  ? '준비 중'
                  : p.phase === 'transcoding'
                    ? '변환 중'
                    : p.phase === 'uploading'
                      ? '업로드 중'
                      : '실패'
              const showPercent =
                p.phase === 'transcoding' || p.phase === 'uploading'
              const isError = p.phase === 'error'
              const Icon =
                p.mediaType === 'video'
                  ? Film
                  : p.mediaType === 'lyrics'
                    ? FileText
                    : Music
              return (
                <li
                  key={p.key}
                  className={`relative flex items-center gap-2 px-2 py-1.5 rounded overflow-hidden ${
                    isError ? 'text-destructive' : 'text-muted-foreground/60'
                  }`}
                  title={p.errorMessage}
                >
                  <Icon
                    className={`size-4 shrink-0 ${
                      !isError && p.phase !== 'uploading'
                        ? 'animate-pulse'
                        : ''
                    }`}
                    aria-hidden
                  />
                  <span className="flex-1 text-sm truncate">{p.name}</span>
                  <span className="text-xs shrink-0 tabular-nums">
                    {phaseLabel}
                    {showPercent ? ` · ${Math.round(p.progress)}%` : ''}
                  </span>
                  {isError && (
                    <button
                      className="text-xs hover:underline shrink-0"
                      onClick={() => dismissPending(p.key)}
                    >
                      닫기
                    </button>
                  )}
                  {!isError && (
                    <span
                      className="absolute left-0 bottom-0 h-0.5 bg-primary/70 transition-[width] duration-150"
                      style={{ width: `${p.progress}%` }}
                      aria-hidden
                    />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
