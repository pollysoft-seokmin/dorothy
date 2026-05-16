/** 오디오 재생 상태 */
export type PlayStatus = 'idle' | 'playing' | 'paused' | 'stopped'

/** 미디어 종류 (오디오/비디오) */
export type MediaType = 'audio' | 'video'

/** ID3 메타데이터 */
export interface TrackMetadata {
  title?: string
  artist?: string
  album?: string
  albumArt?: string // base64 data URL
}

/** 파싱된 LRC 가사 라인 */
export interface LyricLine {
  time: number // 초 단위 타임스탬프
  text: string // 가사 텍스트 (영어/한글 결합 표시용; SAMI는 "en\nko" 형태)
  // SAMI 자막에서만 채워지는 언어별 원문. LRC는 항상 undefined.
  // 둘 중 하나가 존재하면 가사 패널은 언어 토글을 활성화한다.
  en?: string
  ko?: string
}

/** 파싱된 LRC 메타데이터 + 가사 */
export interface ParsedLyrics {
  title?: string
  artist?: string
  album?: string
  lines: LyricLine[]
}
