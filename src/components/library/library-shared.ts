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

// 확장자 기반 분류 — 드래그앤드롭(FileSystemFileEntry.file())으로 받은 파일은
// File.type(MIME)이 비어 있는 경우가 많아 MIME 만으로는 audio/video 판별이 안 된다.
// 확장자 폴백으로 분류/MIME 보강을 한다.
const AUDIO_EXTS = new Set([
  'mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac', 'weba', 'mka',
])
const VIDEO_EXTS = new Set([
  'mp4', 'm4v', 'webm', 'mov', 'mpg', 'mpeg', 'avi', 'mkv', 'flv', 'wmv', '3gp', 'ts', 'ogv',
])

// 확장자 → 대표 MIME. blob 업로드의 allowedContentTypes(audio/*|video/*) 통과와
// 서버 confirmUpload 의 mime 기반 분류를 위해 비어 있는 type 을 채운다.
const EXT_MIME: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
  ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/opus', flac: 'audio/flac',
  weba: 'audio/webm', mka: 'audio/x-matroska',
  mp4: 'video/mp4', m4v: 'video/x-m4v', webm: 'video/webm', mov: 'video/quicktime',
  mpg: 'video/mpeg', mpeg: 'video/mpeg', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  flv: 'video/x-flv', wmv: 'video/x-ms-wmv', '3gp': 'video/3gpp', ts: 'video/mp2t', ogv: 'video/ogg',
}

export function getExt(name: string): string {
  return name.toLowerCase().split('.').pop() ?? ''
}

export async function needsVideoTranscode(file: File): Promise<boolean> {
  // file.type 이 비어 있어도 확장자로 비디오 여부를 판단(드롭 파일 대응).
  if (detectFileMediaType(file) !== 'video') return false
  if (ALWAYS_TRANSCODE_EXTS.has(getExt(file.name))) return true
  return !(await probeVideoPlayable(file))
}

// 업로드 시 사용할 contentType — 비어 있거나 audio/video 가 아니면 확장자에서
// 보강한다. lyrics 는 호출부에서 application/octet-stream 으로 지정한다.
export function resolveUploadMime(file: File, mediaType: 'audio' | 'video'): string {
  if (file.type.startsWith('audio/') || file.type.startsWith('video/')) return file.type
  const byExt = EXT_MIME[getExt(file.name)]
  if (byExt) return byExt
  return mediaType === 'video' ? 'video/mp4' : 'audio/mpeg'
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
  // MIME 이 비거나 generic(빈 문자열/application/octet-stream)일 때 확장자로 폴백.
  const ext = getExt(file.name)
  if (AUDIO_EXTS.has(ext)) return 'audio'
  if (VIDEO_EXTS.has(ext)) return 'video'
  return null
}

export type PendingItem = {
  key: string
  name: string
  mediaType: LibraryMediaType
  // 'done' = 업로드 성공(요약 셀의 전체/진행률 계산을 위해 잠시 유지하다 정리).
  phase: 'preparing' | 'transcoding' | 'uploading' | 'error' | 'done'
  progress: number
  errorMessage?: string
  folderId: string | null
}

// 아직 처리 중(준비/변환/업로드)인 항목 — done/error 는 settled.
export function isUploadActive(p: PendingItem): boolean {
  return p.phase === 'preparing' || p.phase === 'transcoding' || p.phase === 'uploading'
}

export type UploadAggregate = {
  total: number
  processed: number
  errorCount: number
  active: PendingItem | null
  fraction: number
  pct: number
  uploading: boolean
}

// pending 배열을 요약 — 요약 셀과 헤더 진행 링이 공유한다. 진행률은 완료·실패=1,
// 활성 파일=progress/100 로 보고 전체로 나눈 전체 배치 진행률.
export function uploadAggregate(items: PendingItem[]): UploadAggregate {
  const total = items.length
  const errorCount = items.filter((p) => p.phase === 'error').length
  const processed = items.filter(
    (p) => p.phase === 'done' || p.phase === 'error',
  ).length
  const active = items.find(isUploadActive) ?? null
  const fraction =
    total === 0
      ? 0
      : items.reduce(
          (s, p) =>
            s + (p.phase === 'done' || p.phase === 'error' ? 1 : p.progress / 100),
          0,
        ) / total
  return {
    total,
    processed,
    errorCount,
    active,
    fraction,
    pct: Math.round(fraction * 100),
    uploading: active !== null,
  }
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
        : p === 'done'
          ? '완료'
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
