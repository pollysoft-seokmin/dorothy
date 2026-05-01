import { forwardRef } from 'react'
import { cn } from '~/lib/utils'

interface LyricLineProps {
  text: string
  isActive: boolean
  isChecked: boolean
  onClick: () => void
  onCheckToggle: () => void
}

export const LyricLine = forwardRef<HTMLButtonElement, LyricLineProps>(
  ({ text, isActive, isChecked, onClick, onCheckToggle }, ref) => {
    return (
      <div className="flex items-center w-full gap-1">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onCheckToggle}
          className="h-3.5 w-3.5 shrink-0 accent-primary cursor-pointer"
          aria-label={`${text} 구간 선택`}
        />
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          className={cn(
            'flex-1 min-w-0 break-words text-center py-1.5 px-2 rounded transition-all duration-300 cursor-pointer',
            isActive
              ? 'text-lg font-bold text-foreground scale-105'
              : 'text-sm text-muted-foreground/50 hover:text-muted-foreground/80',
          )}
        >
          {text}
        </button>
      </div>
    )
  },
)
LyricLine.displayName = 'LyricLine'
