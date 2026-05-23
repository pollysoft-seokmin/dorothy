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
