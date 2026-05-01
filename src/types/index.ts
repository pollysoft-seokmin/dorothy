/** 오디오 재생 상태 */
export type PlayStatus = 'idle' | 'playing' | 'paused' | 'stopped'

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
  text: string // 가사 텍스트
}

/** 파싱된 LRC 메타데이터 + 가사 */
export interface ParsedLyrics {
  title?: string
  artist?: string
  album?: string
  lines: LyricLine[]
}
