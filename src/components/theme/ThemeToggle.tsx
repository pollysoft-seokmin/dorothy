import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useThemeStore } from '~/stores/theme-store'
import type { Theme } from '~/lib/theme'

const OPTIONS: { key: Theme; label: string; icon: typeof Monitor }[] = [
  { key: 'system', label: '시스템', icon: Monitor },
  { key: 'light', label: '라이트', icon: Sun },
  { key: 'dark', label: '다크', icon: Moon },
]

// 시스템/라이트/다크 3버튼 세그먼트. 선택 칸은 secondary 배경으로 강조 (#107).
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div
      role="group"
      aria-label="테마 선택"
      className="inline-flex items-center gap-0.5 rounded-full border border-border p-0.5"
    >
      {OPTIONS.map((o) => {
        const Icon = o.icon
        const active = theme === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => setTheme(o.key)}
            aria-pressed={active}
            aria-label={o.label}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold tracking-[-0.01em] transition-colors',
              active
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
