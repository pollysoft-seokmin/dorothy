import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '~/lib/utils'
import { useThemeStore } from '~/stores/theme-store'
import type { Theme } from '~/lib/theme'

const OPTIONS: { key: Theme; label: string; icon: typeof Monitor }[] = [
  { key: 'system', label: '시스템', icon: Monitor },
  { key: 'light', label: '라이트', icon: Sun },
  { key: 'dark', label: '다크', icon: Moon },
]

// 시스템/라이트/다크 드롭다운. 트리거는 현재 테마(아이콘 + 라벨), 메뉴에서 선택 (#107).
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const current = OPTIONS.find((o) => o.key === theme) ?? OPTIONS[0]
  const CurrentIcon = current.icon

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="테마 선택"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-[13px] font-bold text-foreground hover:bg-muted"
        >
          <CurrentIcon className="size-4" />
          {current.label}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-[70] min-w-[9rem] rounded-md border bg-popover py-1 shadow-md"
        >
          {OPTIONS.map((o) => {
            const Icon = o.icon
            const active = o.key === theme
            return (
              <DropdownMenu.Item
                key={o.key}
                onSelect={() => setTheme(o.key)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-4" />
                <span className="flex-1">{o.label}</span>
                {active && <Check className="size-3.5 text-primary-bright" />}
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
