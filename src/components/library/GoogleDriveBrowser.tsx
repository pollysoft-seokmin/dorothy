import { useCallback, useEffect, useMemo, useState } from 'react'
import { Cloud, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '~/lib/auth-client'
import {
  GOOGLE_DRIVE_SCOPES,
  driveFileUrl,
  type DrivePlayParams,
} from '~/lib/google-drive'
import { basenameNoExt } from '~/components/library/library-shared'
import {
  getGoogleDriveStatus,
  listGoogleDriveContents,
  type GoogleDriveAsset,
  type GoogleDriveFolder,
} from '~/server/google-drive'
import {
  AssetRow,
  BreadcrumbChips,
  FolderRow,
} from '~/components/library/library-atoms'

type Props = {
  onPlay: (params: DrivePlayParams) => void
  onPlayed?: () => void
  density?: 'comfortable' | 'compact'
}

type DriveCrumb = { id: string | null; name: string }

export function GoogleDriveBrowser({
  onPlay,
  onPlayed,
  density = 'comfortable',
}: Props) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [hasDriveScope, setHasDriveScope] = useState(false)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [crumbs, setCrumbs] = useState<DriveCrumb[]>([{ id: null, name: '내 드라이브' }])
  const [folders, setFolders] = useState<GoogleDriveFolder[]>([])
  const [assets, setAssets] = useState<GoogleDriveAsset[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [unsupportedCount, setUnsupportedCount] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const status = await getGoogleDriveStatus()
      setConnected(status.connected)
      setHasDriveScope(status.hasDriveScope)
    } catch (e) {
      setConnected(false)
      setHasDriveScope(false)
      toast.error(e instanceof Error ? e.message : 'Google Drive 상태를 확인하지 못했습니다')
    }
  }, [])

  const loadContents = useCallback(async (id: string | null) => {
    setLoading(true)
    try {
      const data = await listGoogleDriveContents({
        data: { folderId: id },
      })
      setErrorMessage(null)
      setFolders(Array.isArray(data?.folders) ? data.folders : [])
      setAssets(Array.isArray(data?.assets) ? data.assets : [])
      setTotalCount(typeof data?.totalCount === 'number' ? data.totalCount : 0)
      setUnsupportedCount(
        typeof data?.unsupportedCount === 'number' ? data.unsupportedCount : 0,
      )
    } catch (e) {
      setFolders([])
      setAssets([])
      setTotalCount(0)
      setUnsupportedCount(0)
      const message = e instanceof Error ? e.message : 'Google Drive를 불러오지 못했습니다'
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!connected || !hasDriveScope) return
    void loadContents(folderId)
  }, [connected, hasDriveScope, folderId, loadContents])

  const connectDrive = useCallback(async () => {
    setConnecting(true)
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
        scopes: GOOGLE_DRIVE_SCOPES,
      })
      if (error) toast.error(error.message ?? 'Google Drive 연결에 실패했습니다')
    } catch {
      toast.error('Google Drive 연결에 실패했습니다')
    } finally {
      setConnecting(false)
    }
  }, [])

  const openFolder = useCallback((folder: GoogleDriveFolder) => {
    setFolderId(folder.id)
    setCrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])
  }, [])

  const selectCrumb = useCallback((id: string | null) => {
    setFolderId(id)
    setCrumbs((prev) => {
      const index = prev.findIndex((c) => c.id === id)
      return index === -1 ? [{ id: null, name: '내 드라이브' }] : prev.slice(0, index + 1)
    })
  }, [])

  const playableAssets = useMemo(
    () => (Array.isArray(assets) ? assets : []).filter((a) => a.mediaType !== 'lyrics'),
    [assets],
  )

  const playAsset = useCallback(
    (asset: GoogleDriveAsset) => {
      if (asset.mediaType === 'lyrics') return
      const stem = basenameNoExt(asset.name)
      const sibling = assets.find(
        (s) => s.mediaType === 'lyrics' && basenameNoExt(s.name) === stem,
      )
      onPlay({
        url: driveFileUrl(asset.id),
        name: asset.name,
        mediaType: asset.mediaType === 'video' ? 'video' : 'audio',
        lrcUrl: sibling ? driveFileUrl(sibling.id) : undefined,
        source: 'google_drive',
        providerFileId: asset.id,
        providerLrcFileId: sibling?.id,
        mimeType: asset.mimeType,
      })
      onPlayed?.()
    },
    [assets, onPlay, onPlayed],
  )

  if (connected === null) {
    return <p className="py-6 text-center text-sm text-text-dim">불러오는 중...</p>
  }

  if (!connected || !hasDriveScope) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center px-6 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-secondary text-primary-bright">
          <Cloud className="size-6" />
        </div>
        <div className="mt-3 text-sm font-extrabold text-foreground">
          Google Drive 연결 필요
        </div>
        <p className="mt-1.5 max-w-[260px] text-xs leading-relaxed text-muted-foreground">
          Drive의 오디오, 비디오, LRC 파일을 Dorothy에서 바로 탐색하고 재생합니다.
        </p>
        <button
          type="button"
          onClick={connectDrive}
          disabled={connecting}
          className="mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-primary-bright px-4 text-xs font-extrabold text-background disabled:opacity-50"
        >
          <Cloud className="size-4" />
          {connecting ? '연결 중...' : 'Google Drive 연결'}
        </button>
      </div>
    )
  }

  const isInitialLoading = loading && folders.length === 0 && assets.length === 0
  const isEmpty = !loading && folders.length === 0 && playableAssets.length === 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={density === 'compact' ? 'flex items-center gap-1 border-b border-border px-3.5' : 'flex items-center gap-1 px-4'}>
        <div className="min-w-0 flex-1">
          <BreadcrumbChips
            crumbs={crumbs}
            onSelect={selectCrumb}
            density={density}
          />
        </div>
        <button
          type="button"
          aria-label="Google Drive 새로고침"
          onClick={() => loadContents(folderId)}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      <div className={density === 'compact' ? 'flex-1 overflow-y-auto px-2.5 pb-2' : 'flex-1 overflow-y-auto px-5 pb-3'}>
        {isInitialLoading ? (
          <p className="py-6 text-center text-sm text-text-dim">불러오는 중...</p>
        ) : errorMessage ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center px-4 text-center">
            <div className="text-sm font-extrabold text-foreground">
              Google Drive를 불러오지 못했습니다
            </div>
            <p className="mt-2 max-w-[280px] whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => loadContents(folderId)}
              className="mt-4 h-8 rounded-full bg-secondary px-3 text-xs font-extrabold text-foreground"
            >
              다시 시도
            </button>
          </div>
        ) : isEmpty ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <div>
              {totalCount > 0
                ? '이 위치에 재생 가능한 파일이 없습니다.'
                : '이 폴더가 비어 있습니다.'}
            </div>
            {totalCount > 0 && (
              <div className="mt-1 text-xs text-text-dim">
                총 {totalCount}개 중 {unsupportedCount}개가 지원하지 않는 형식입니다.
              </div>
            )}
          </div>
        ) : (
          // 섹션 구분 없이 폴더(위) → 파일(아래) 순서로 평면 나열.
          <div className={density === 'compact' ? 'pt-1.5' : 'pt-2'}>
            {folders.map((folder) => (
              <FolderRow
                key={folder.id}
                name={folder.name}
                onClick={() => openFolder(folder)}
                density={density}
              />
            ))}
            {playableAssets.map((asset) => (
              <AssetRow
                key={asset.id}
                asset={{
                  id: asset.id,
                  name: asset.name,
                  mediaType: asset.mediaType,
                  mimeType: asset.mimeType,
                  sizeBytes: asset.sizeBytes,
                  url: driveFileUrl(asset.id),
                  createdAt: asset.modifiedTime ?? undefined,
                }}
                active={false}
                playing={false}
                density={density}
                onClick={() => playAsset(asset)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
