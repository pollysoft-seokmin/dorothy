import * as React from 'react'
import { cn } from '~/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

// Spotify-style 다크 입력 — surface #1A1A1A 베이스에 외곽선 없음, 포커스 시
// 화이트 ring으로 강조. iOS 자동 줌을 피하기 위해 text-base(16px) 사용.
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-12 w-full rounded-md border border-transparent bg-secondary px-4 py-2 text-base text-foreground transition-colors',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-text-dim',
          'focus-visible:outline-none focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-foreground/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
