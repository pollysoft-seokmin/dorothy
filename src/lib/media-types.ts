// 미디어 타입 판별 — 서버(Drive 목록)와 클라이언트(드롭 파일) 양쪽에서 쓰는
// 순수 유틸. library-shared.ts 는 ~/lib/transcode(브라우저 전용 ffmpeg)를
// 끌어와 서버에서 import 할 수 없으므로, 확장자/MIME 판별만 여기로 분리한다.

export type MediaKind = 'audio' | 'video' | 'lyrics'

// 확장자 기반 분류 — 드래그앤드롭(FileSystemFileEntry.file())이나 Drive 메타데이터는
// MIME 이 비거나 generic 인 경우가 많아 확장자 폴백이 필요하다.
export const AUDIO_EXTS = new Set([
  'mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac', 'weba', 'mka',
])
export const VIDEO_EXTS = new Set([
  'mp4', 'm4v', 'webm', 'mov', 'mpg', 'mpeg', 'avi', 'mkv', 'flv', 'wmv', '3gp', 'ts', 'ogv',
])

export function getExt(name: string): string {
  return name.toLowerCase().split('.').pop() ?? ''
}

// 이름 + (선택)MIME 으로 미디어 종류 판별. .lrc 는 가사로 분류.
export function detectMediaTypeByName(
  name: string,
  mimeType?: string | null,
): MediaKind | null {
  if (name.toLowerCase().endsWith('.lrc')) return 'lyrics'
  if (mimeType?.startsWith('audio/')) return 'audio'
  if (mimeType?.startsWith('video/')) return 'video'
  const ext = getExt(name)
  if (AUDIO_EXTS.has(ext)) return 'audio'
  if (VIDEO_EXTS.has(ext)) return 'video'
  return null
}
