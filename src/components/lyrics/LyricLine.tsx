import { forwardRef } from 'react'
import { cn } from '~/lib/utils'

interface LyricLineProps {
  text: string
  isActive: boolean
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

export const LyricLine = forwardRef<HTMLButtonElement, LyricLineProps>(
  (
    { text, isActive, isChecked, maskState, onClick, onCheckToggle, onMaskToggle },
    ref,
  ) => {
    const displayText = maskText(text, maskState)
    return (
      <div className="flex items-center w-full gap-1">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onCheckToggle}
          tabIndex={-1}
          className="relative z-10 h-3.5 w-3.5 shrink-0 accent-primary cursor-pointer"
          aria-label={`${text} 구간 선택`}
        />
        <div
          onClick={onMaskToggle}
          className="w-12 self-stretch shrink-0 cursor-pointer"
          aria-hidden="true"
        />
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          tabIndex={-1}
          className={cn(
            'flex-1 min-w-0 whitespace-pre-line break-words text-left py-1.5 px-2 rounded cursor-pointer text-sm text-[#000000]',
            isActive && 'font-bold',
          )}
        >
          {displayText}
        </button>
      </div>
    )
  },
)
LyricLine.displayName = 'LyricLine'
