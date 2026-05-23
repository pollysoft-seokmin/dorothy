import { forwardRef } from 'react'
import { Check } from 'lucide-react'
import { cn } from '~/lib/utils'

export type LyricPosition = 'past' | 'active' | 'future'

interface LyricLineProps {
  // 항상 표시되는 1차 라인. 영문 단일 / SAMI en-ko에서는 영문 / SAMI ko에서는 한글.
  primary: string
  // SAMI en-ko 모드에서만 채워지는 보조 라인(한글). 단일 언어 모드에서는 undefined.
  secondary?: string
  position: LyricPosition
  isChecked: boolean
  maskState: 0 | 1 | 2
  onClick: () => void
  onCheckToggle: () => void
  onMaskToggle: () => void
}

// 줄 단위로 마스킹. 공백/줄바꿈은 보존, 비공백 문자만 처리.
// state 0: 모두 '-'로, 1: 각 줄 첫 3개 비공백만 노출, 2: 원본 그대로.
function maskText(text: string, state: 0 | 1 | 2): string {
  if (state === 2) return text
  const reveal = state === 1 ? 3 : 0
  return text
    .split('\n')
    .map((line) => {
      let revealed = 0
      return Array.from(line)
        .map((ch) => {
          if (/\s/.test(ch)) return ch
          if (revealed < reveal) {
            revealed++
            return ch
          }
          return '-'
        })
        .join('')
    })
    .join('\n')
}

// Spotify의 가사 라인 패턴 — 활성은 24px / Manrope 800 white, 다음 라인은 19px
// 0.85 opacity, 지난 라인은 0.5 opacity로 감쇠. SAMI 이중언어는 영문 헤드라인
// + 한글 보조 라인(textMute → textDim)으로 위계 분리.
export const LyricLine = forwardRef<HTMLButtonElement, LyricLineProps>(
  (
    {
      primary,
      secondary,
      position,
      isChecked,
      maskState,
      onClick,
      onCheckToggle,
      onMaskToggle,
    },
    ref,
  ) => {
    const isActive = position === 'active'
    const isPast = position === 'past'
    const primaryDisplay = maskText(primary, maskState)
    const secondaryDisplay = secondary ? maskText(secondary, maskState) : undefined

    return (
      <div className="flex w-full items-start gap-3 px-2">
        {/* 체크박스 — 체크 시 그린 채움, 비체크 시 외곽선 + 투명 체크. 키보드
            트래버스는 부모(가사 영역) 단에서 처리하므로 tabIndex=-1. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onCheckToggle()
          }}
          tabIndex={-1}
          aria-pressed={isChecked}
          aria-label={`${primary} 구간 선택`}
          className={cn(
            'mt-2 grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded-[3px] border transition-colors',
            isChecked
              ? 'border-transparent bg-primary-bright text-background'
              : 'border-text-dim text-transparent hover:border-muted-foreground',
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </button>

        {/* 노출 토글 트리거 — 클릭 영역만 차지 */}
        <div
          onClick={onMaskToggle}
          className="w-6 self-stretch shrink-0 cursor-pointer"
          aria-hidden="true"
        />

        <button
          ref={ref}
          type="button"
          onClick={onClick}
          tabIndex={-1}
          className={cn(
            'min-w-0 flex-1 cursor-pointer rounded text-left transition-all duration-300',
            isActive ? 'opacity-100' : isPast ? 'opacity-50' : 'opacity-85',
          )}
        >
          <div
            className={cn(
              'whitespace-pre-line break-words leading-tight transition-all duration-300',
              isActive
                ? 'text-2xl font-extrabold tracking-[-0.02em] text-foreground'
                : isPast
                  ? 'text-lg font-bold tracking-[-0.02em] text-text-dim'
                  : 'text-lg font-bold tracking-[-0.02em] text-muted-foreground',
            )}
          >
            {primaryDisplay}
          </div>
          {secondaryDisplay !== undefined && (
            <div
              className={cn(
                'mt-0.5 whitespace-pre-line break-words leading-snug font-semibold transition-all duration-300',
                isActive
                  ? 'text-base text-muted-foreground'
                  : 'text-sm text-text-dim',
              )}
            >
              {secondaryDisplay}
            </div>
          )}
        </button>
      </div>
    )
  },
)
LyricLine.displayName = 'LyricLine'
