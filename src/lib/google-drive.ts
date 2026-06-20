export const GOOGLE_DRIVE_READONLY_SCOPE =
  'https://www.googleapis.com/auth/drive.readonly'

export const GOOGLE_DRIVE_SCOPES = [GOOGLE_DRIVE_READONLY_SCOPE]

// Drive 파일을 스트리밍하는 프록시 라우트 URL. 모든 Drive 재생 경로
// (브라우저/즐겨찾기/최근)가 공유하는 단일 계약 — 라우트 경로가 바뀌면
// 여기 한 곳만 고치면 된다.
export function driveFileUrl(id: string): string {
  return `/api/google-drive/file?id=${encodeURIComponent(id)}`
}

// 재생 요청 페이로드 — GoogleDriveBrowser/최근/즐겨찾기 → 라이브러리 → player
// loadUrl 로 흐르는 공통 형태. 여러 곳에 손으로 재선언하던 타입을 단일화.
export type DrivePlayParams = {
  url: string
  name: string
  mediaType: 'audio' | 'video'
  lrcUrl?: string
  source?: 'google_drive'
  providerFileId?: string
  providerLrcFileId?: string
  mimeType?: string
}
