import { probeVideoPlayable } from '~/lib/transcode'
import { detectMediaTypeByName, getExt } from '~/lib/media-types'

export { getExt }

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

export async function needsVideoTranscode(file: File): Promise<boolean> {
  // file.type 이 비어 있어도 확장자로 비디오 여부를 판단(드롭 파일 대응).
  if (detectFileMediaType(file) !== 'video') return false
  if (ALWAYS_TRANSCODE_EXTS.has(getExt(file.name))) return true
  return !(await probeVideoPlayable(file))
}

export type AssetItem = {
  id: string
  name: string
  mediaType: string
  mimeType: string
  sizeBytes: number
  url: string
  createdAt?: string | Date
}

export type LibraryMediaType = 'audio' | 'video' | 'lyrics'

export function detectFileMediaType(file: File): LibraryMediaType | null {
  return detectMediaTypeByName(file.name, file.type)
}

export function basenameNoExt(name: string): string {
  const lastDot = name.lastIndexOf('.')
  return (lastDot > 0 ? name.slice(0, lastDot) : name).toLowerCase()
}

// 최근 재생 항목 — server getRecentPlaybacks 의 행 구조를 클라이언트에서 다루기
// 위한 구조적 타입. lastPlayedAt 은 직렬화 경로에 따라 Date/string 둘 다 가능.
export type RecentPlayback = {
  id: string
  title: string | null
  artist: string | null
  album: string | null
  fileName: string
  source: string
  providerFileId: string | null
  providerLrcFileId: string | null
  mediaType: string | null
  durationSeconds: number | null
  lastPlayedAt: Date | string
}

// 즐겨찾기 항목 — Google Drive 파일 id 를 기준으로 저장/재생한다.
export type FavoriteItem = {
  id: string
  fileId: string
  name: string
  mediaType: 'audio' | 'video'
  mimeType?: string
  url: string
  lrcFileId?: string
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
