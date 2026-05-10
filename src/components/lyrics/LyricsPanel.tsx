import { useEffect, useRef, useCallback, createRef } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { LyricLine } from './LyricLine'
import type { ParsedLyrics } from '~/types'

interface LyricsPanelProps {
  lyrics: ParsedLyrics | null
  currentLineIndex: number
  checkedLines: Set<number>
  loading?: boolean
  onLineClick: (time: number) => void
  onToggleCheck: (index: number) => void
  onAddLrc?: () => void
}

export function LyricsPanel({
  lyrics,
  currentLineIndex,
  checkedLines,
  loading = false,
  onLineClick,
  onToggleCheck,
  onAddLrc,
}: LyricsPanelProps) {
  const activeRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 활성 라인이 변경되면 컨테이너 내부에서 중앙으로 스크롤.
  // scrollIntoView는 외부 스크롤(body)도 건드려 페이지가 가로로 밀리는
  // 케이스가 있어(활성 버튼의 scale-105 박스가 viewport 우측을 넘을 때)
  // 컨테이너의 scrollTop만 직접 계산해 갱신한다.
  // 이미 충분히 중앙에 있으면 호출을 생략 — sub-pixel 차이 때문에 매번
  // smooth 애니메이션이 발동해 macOS overlay 스크롤바가 계속 노출되는
  // 부작용을 막는다.
  useEffect(() => {
    const target = activeRef.current
    const container = containerRef.current
    if (!target || !container) return
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const relativeTop = targetRect.top - containerRect.top + container.scrollTop
    const desiredTop =
      relativeTop - container.clientHeight / 2 + target.clientHeight / 2
    if (Math.abs(desiredTop - container.scrollTop) < 4) return
    container.scrollTo({ top: desiredTop, behavior: 'smooth' })
  }, [currentLineIndex])

  // 가사 로딩 중 — 추출/사이드카 fetch가 끝나기 전 빈 패널 대신 스피너 표시
  if (loading && !lyrics) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 h-48 sm:h-64 text-muted-foreground"
        role="status"
        aria-label="가사 불러오는 중"
      >
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">가사 불러오는 중...</p>
      </div>
    )
  }

  // LRC 미로드
  if (!lyrics) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-48 sm:h-64 text-muted-foreground">
        <FileText className="h-8 w-8" />
        <p className="text-sm">가사가 없습니다</p>
        {onAddLrc && (
          <button
            type="button"
            onClick={onAddLrc}
            className="text-xs text-primary hover:underline cursor-pointer"
          >
            LRC 파일 추가
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-48 sm:h-64 overflow-y-auto overflow-x-hidden scrollbar-thin py-8"
    >
      <div className="flex flex-col items-center gap-0.5">
        {lyrics.lines.map((line, i) => (
          <LyricLine
            key={`${line.time}-${i}`}
            ref={i === currentLineIndex ? activeRef : undefined}
            text={line.text}
            isActive={i === currentLineIndex}
            isChecked={checkedLines.has(i)}
            onClick={() => onLineClick(line.time)}
            onCheckToggle={() => onToggleCheck(i)}
          />
        ))}
      </div>
    </div>
  )
}
