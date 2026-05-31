import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { LyricLine, type LyricPosition } from './LyricLine'
import type { ParsedLyrics, LyricLine as LyricLineType } from '~/types'
import type { LineMaskState, LyricsLanguage } from '~/stores/player-store'

interface LyricsPanelProps {
  lyrics: ParsedLyrics | null
  currentLineIndex: number
  checkedLines: Set<number>
  lineMaskStates: Map<number, LineMaskState>
  globalLineMask: LineMaskState
  language: LyricsLanguage
  loading?: boolean
  onLineClick: (time: number) => void
  onToggleCheck: (index: number) => void
  onMaskToggle: (index: number) => void
}

// SAMI 라인은 en/ko 별도 필드를 갖고 LRC 라인은 text만 갖는다.
// 단일 언어 모드에서 해당 언어가 없으면 빈 문자열을 반환해 라인 자체는
// 유지(체크박스/마스크/index 안정성)하되 텍스트만 비운다.
// en-ko 모드 + SAMI 라인은 영문(primary) + 한글(secondary)로 stack 렌더.
//
// 다국어 동일 본문 케이스: 일부 SAMI 자막은 EN/KO 섹션에 같은 문자열(보통
// 한국어 번역)을 복제해 둔다. 이때 en-ko 모드에서 두 줄이 그대로 표시되면
// 중복 처음이라 한 줄로 축약 — 데이터 레이어의 en/ko 두 필드는 그대로 두어
// 단일 언어 모드(en / ko)에서는 라인이 비지 않게 한다. (#65)
function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

function pickLineTexts(
  line: LyricLineType,
  language: LyricsLanguage,
): { primary: string; secondary?: string } {
  const isSami = line.en !== undefined || line.ko !== undefined
  if (!isSami) {
    // LRC는 항상 text 그대로. 언어 토글이 비활성이므로 language는 무시.
    return { primary: line.text }
  }
  if (language === 'en') return { primary: line.en ?? '' }
  if (language === 'ko') return { primary: line.ko ?? '' }
  // en-ko: 영문 헤드라인 + 한글 보조 — 단, 두 본문이 동일하면 한 줄로 축약.
  const en = line.en ?? ''
  const ko = line.ko ?? ''
  if (en && ko && normalizeWhitespace(en) === normalizeWhitespace(ko)) {
    return { primary: ko }
  }
  return { primary: en, secondary: ko }
}

export function LyricsPanel({
  lyrics,
  currentLineIndex,
  checkedLines,
  lineMaskStates,
  globalLineMask,
  language,
  loading = false,
  onLineClick,
  onToggleCheck,
  onMaskToggle,
}: LyricsPanelProps) {
  const activeRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevLyricsRef = useRef<ParsedLyrics | null>(null)

  // 활성 라인이 변경되면 컨테이너 내부에서 중앙으로 스크롤.
  // scrollIntoView는 외부 스크롤(body)도 건드려 페이지가 가로로 밀리는
  // 케이스가 있어(활성 버튼의 scale-105 박스가 viewport 우측을 넘을 때)
  // 컨테이너의 scrollTop만 직접 계산해 갱신한다.
  // 이미 충분히 중앙에 있으면 호출을 생략 — sub-pixel 차이 때문에 매번
  // smooth 애니메이션이 발동해 macOS overlay 스크롤바가 계속 노출되는
  // 부작용을 막는다.
  //
  // 새 가사가 로드되면(lyrics reference 변경) 활성 라인 스크롤보다 우선해
  // 최상단으로 초기화. 새 미디어를 골라 LRC/SAMI가 갱신되었을 때 이전 곡의
  // 스크롤 위치가 남는 것을 막는다.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (prevLyricsRef.current !== lyrics) {
      prevLyricsRef.current = lyrics
      container.scrollTop = 0
      return
    }

    const target = activeRef.current
    if (!target) return
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const relativeTop = targetRect.top - containerRect.top + container.scrollTop
    const desiredTop =
      relativeTop - container.clientHeight / 2 + target.clientHeight / 2
    if (Math.abs(desiredTop - container.scrollTop) < 4) return
    container.scrollTo({ top: desiredTop, behavior: 'smooth' })
  }, [lyrics, currentLineIndex])

  // 가사 로딩 중 — 추출/사이드카 fetch가 끝나기 전 빈 패널 대신 스피너 표시
  if (loading && !lyrics) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 flex-1 min-h-0 text-muted-foreground"
        role="status"
        aria-label="가사 불러오는 중"
      >
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">가사 불러오는 중...</p>
      </div>
    )
  }

  // 가사 없음 — 안내 UI 를 띄우지 않고 빈자리만 둔다 (#94).
  if (!lyrics) return null

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin py-4"
    >
      <div className="flex min-h-full flex-col justify-center gap-1">
        {lyrics.lines.map((line, i) => {
          const { primary, secondary } = pickLineTexts(line, language)
          const position: LyricPosition =
            i === currentLineIndex
              ? 'active'
              : i < currentLineIndex
                ? 'past'
                : 'future'
          return (
            <LyricLine
              key={`${line.time}-${i}`}
              ref={i === currentLineIndex ? activeRef : undefined}
              primary={primary}
              secondary={secondary}
              position={position}
              isChecked={checkedLines.has(i)}
              maskState={lineMaskStates.get(i) ?? globalLineMask}
              onClick={() => onLineClick(line.time)}
              onCheckToggle={() => onToggleCheck(i)}
              onMaskToggle={() => onMaskToggle(i)}
            />
          )
        })}
      </div>
    </div>
  )
}
