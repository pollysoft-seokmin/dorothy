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

/**
 * URL에서 LRC 텍스트를 가져와 파싱한다. 실패/빈 파싱은 null.
 * (사용자 토스트는 호출 측에서 결정 — 라이브러리 자동 로딩 같은 silent
 * 경로에서도 쓰기 위해 토스트는 띄우지 않는다.)
 */
export async function fetchLyricsFromUrl(
  url: string,
): Promise<ParsedLyrics | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()
    if (text.includes('�')) return null
    const parsed = parseLrc(text)
    if (parsed.lines.length === 0) return null
    return parsed
  } catch {
    return null
  }
}
