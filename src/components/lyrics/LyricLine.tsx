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

// 가사 라인 — 활성/지난/다음/보조 본문 모두 14px(text-[14px]) 한 가지 사이즈.
// 위계는 weight/color/opacity 로만 분리: 활성은 extrabold + foreground +
// opacity-100, 다음은 bold + muted-foreground + opacity-85, 지난은 bold +
// text-dim + opacity-50. SAMI 이중언어는 영문 헤드라인 + 한글 보조 라인
// (muted-foreground → text-dim) 으로 추가 위계.
// row 컨테이너에 py-1 (위/아래 4px) 호흡 여백.
// 본문이 비어 있어도(단일 언어 모드 + 결측 라인) 라인 row 가 접히지 않게
// primary div 에 min-h-6 (24px) 을 둬 스크롤 점프를 막는다.
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
      <div className="flex w-full items-start gap-3 px-2 py-1">
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
              'mt-2 min-h-6 whitespace-pre-line break-words text-[14px] leading-tight tracking-[-0.02em] transition-all duration-300',
              isActive
                ? 'font-extrabold text-foreground'
                : isPast
                  ? 'font-bold text-text-dim'
                  : 'font-bold text-muted-foreground',
            )}
          >
            {primaryDisplay}
          </div>
          {secondaryDisplay !== undefined && (
            <div
              className={cn(
                'mt-0.5 min-h-6 whitespace-pre-line break-words text-[14px] leading-snug font-semibold transition-all duration-300',
                isActive ? 'text-muted-foreground' : 'text-text-dim',
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
