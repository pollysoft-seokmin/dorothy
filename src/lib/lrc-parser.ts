import type { LyricLine, ParsedLyrics } from '~/types'

const TIME_RE = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g
const META_RE = /\[(ti|ar|al):(.+)\]/i

/**
 * LRC 파일 텍스트를 파싱하여 ParsedLyrics 객체를 반환합니다.
 */
export function parseLrc(lrcText: string): ParsedLyrics {
  const lines: LyricLine[] = []
  let title: string | undefined
  let artist: string | undefined
  let album: string | undefined

  for (const raw of lrcText.split('\n')) {
    const line = raw.trim()
    if (!line) continue

    // 메타데이터 태그
    const metaMatch = line.match(META_RE)
    if (metaMatch) {
      const key = metaMatch[1].toLowerCase()
      const value = metaMatch[2].trim()
      if (key === 'ti') title = value
      else if (key === 'ar') artist = value
      else if (key === 'al') album = value
      continue
    }

    // 타임스탬프 추출
    const timestamps: number[] = []
    let match: RegExpExecArray | null
    const re = new RegExp(TIME_RE.source, 'g')
    while ((match = re.exec(line)) !== null) {
      const min = parseInt(match[1], 10)
      const sec = parseInt(match[2], 10)
      const ms =
        match[3].length === 2
          ? parseInt(match[3], 10) * 10
          : parseInt(match[3], 10)
      timestamps.push(min * 60 + sec + ms / 1000)
    }

    if (timestamps.length === 0) continue

    // 타임스탬프 이후의 텍스트 추출
    const content = line.replace(TIME_RE, '').trim()
    if (!content) continue

    for (const time of timestamps) {
      lines.push({ time, text: content })
    }
  }

  // 시간순 정렬
  lines.sort((a, b) => a.time - b.time)

  return { title, artist, album, lines }
}
