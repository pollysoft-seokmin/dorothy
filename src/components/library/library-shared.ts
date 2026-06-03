import { probeVideoPlayable } from '~/lib/transcode'

// 변환을 항상 강제하는 확장자 — 브라우저가 못 띄우는 컨테이너.
// MP4 같은 일반 포맷은 probeVideoPlayable이 결정.
const ALWAYS_TRANSCODE_EXTS = new Set([
  'mpg',
  'mpeg',
  'avi',
  'mkv',
  'flv',
  'wmv',
  '3gp',
])

export function getExt(name: string): string {
  return name.toLowerCase().split('.').pop() ?? ''
}

export async function needsVideoTranscode(file: File): Promise<boolean> {
  if (!file.type.startsWith('video/')) return false
  if (ALWAYS_TRANSCODE_EXTS.has(getExt(file.name))) return true
  return !(await probeVideoPlayable(file))
}

export type FolderRow = {
  id: string
  parentId: string | null
  name: string
  createdAt: string | Date
}

export type FolderListItem = {
  id: string
  name: string
  createdAt: string | Date
}

export type AssetItem = {
  id: string
  name: string
  mediaType: string
  mimeType: string
  sizeBytes: number
  blobUrl: string
  createdAt: string | Date
}

export type LibraryMediaType = 'audio' | 'video' | 'lyrics'

export function detectFileMediaType(file: File): LibraryMediaType | null {
  if (file.name.toLowerCase().endsWith('.lrc')) return 'lyrics'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

export type PendingItem = {
  key: string
  name: string
  mediaType: LibraryMediaType
  phase: 'preparing' | 'transcoding' | 'uploading' | 'error'
  progress: number
  errorMessage?: string
  folderId: string | null
}

export function basenameNoExt(name: string): string {
  const lastDot = name.lastIndexOf('.')
  return (lastDot > 0 ? name.slice(0, lastDot) : name).toLowerCase()
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

export function phaseLabel(p: PendingItem['phase']): string {
  return p === 'preparing'
    ? '준비 중'
    : p === 'transcoding'
      ? '변환 중'
      : p === 'uploading'
        ? '업로드 중'
        : '실패'
}

// 최근 재생 항목 — server getRecentPlaybacks 의 행 구조를 클라이언트에서 다루기
// 위한 구조적 타입. lastPlayedAt 은 직렬화 경로에 따라 Date/string 둘 다 가능.
export type RecentPlayback = {
  id: string
  title: string | null
  artist: string | null
  album: string | null
  fileName: string
  durationSeconds: number | null
  lastPlayedAt: Date | string
}

// 즐겨찾기 항목 — server getFavorites/toggleFavorite 가 돌려주는 구조. position
// 오름차순이 표시 순서. blobUrl/lrcUrl 로 곧장 재생 페이로드를 구성한다.
export type FavoriteItem = {
  id: string
  mediaAssetId: string
  name: string
  mediaType: 'audio' | 'video'
  blobUrl: string
  lrcUrl?: string
  position: number
}

// "lastPlayedAt"을 한국어 상대 시간으로. 매우 좁은 의미라 외부 의존성 없이 인라인.
export function formatRelativeTime(at: Date | string): string {
  const ts = typeof at === 'string' ? new Date(at) : at
  const diffSec = Math.max(0, (Date.now() - ts.getTime()) / 1000)
  if (diffSec < 60) return '방금 전'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`
  if (diffSec < 86400 * 2) return '어제'
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`
  return ts.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}
