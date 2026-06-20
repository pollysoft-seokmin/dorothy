import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { authClient, useSession } from '~/lib/auth-client'
import { ThemeToggle } from '~/components/theme/ThemeToggle'
import { usePlayerStore } from '~/stores/player-store'
import { cn } from '~/lib/utils'
import {
  displayName as deriveDisplayName,
  avatarColor,
} from '~/lib/user-display'

// 켜짐=primary-bright 트랙 + 흰 노브. 외부 의존성 없이 인라인.
function SettingSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full px-0.5 transition-colors',
        checked ? 'bg-primary-bright' : 'bg-muted-foreground/40',
      )}
    >
      <span
        className={cn(
          'size-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}

interface AccountPanelProps {
  // 부모(시트/모달)가 보일 때만 true. fetch 게이트 + 세션 로그아웃 시 onClose 가드.
  active: boolean
  onClose: () => void
}

export function AccountPanel({ active, onClose }: AccountPanelProps) {
  const { data } = useSession()
  const router = useRouter()

  const [signingOut, setSigningOut] = useState(false)

  const autoStopAfterLine = usePlayerStore((s) => s.autoStopAfterLine)
  const setAutoStopAfterLine = usePlayerStore((s) => s.setAutoStopAfterLine)

  // 세션이 사라지면(로그아웃 등) 부모를 닫게 한다.
  useEffect(() => {
    if (active && !data?.user) onClose()
  }, [active, data?.user, onClose])

  const handleSignOut = async () => {
    setSigningOut(true)
    const { error } = await authClient.signOut()
    setSigningOut(false)
    if (error) {
      toast.error('로그아웃에 실패했습니다')
      return
    }
    toast.success('로그아웃되었습니다')
    onClose()
    router.invalidate()
  }

  if (!data?.user) return null

  // 이름/이메일/이미지는 Google 인증 정보를 그대로 사용한다. 이름 미설정 시에만
  // 이메일 @ 앞부분 CamelCase 로 폴백 — 타이틀과 동일 (#114).
  const displayName = deriveDisplayName(data.user)
  const initial = displayName[0]?.toUpperCase() ?? 'U'
  const avatarBg = avatarColor(data.user.email ?? '')
  const avatarImage = data.user.image ?? null

  return (
    <>
      {/* Profile card — Google 프로필 이미지(없으면 이니셜 아바타) + 이름 + 이메일.
          로그아웃은 이름/이메일과 좌측 정렬(아바타 우측 컬럼 내부) (#113) */}
      <div className="rounded-xl bg-secondary p-4">
        <div className="flex items-start gap-3.5">
          {avatarImage ? (
            <img
              src={avatarImage}
              alt=""
              referrerPolicy="no-referrer"
              className="size-[52px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className="grid shrink-0 place-items-center rounded-full text-xl font-extrabold text-white"
              style={{ width: 52, height: 52, background: avatarBg }}
            >
              {initial}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-foreground">
              {displayName}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {data.user.email}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border dark:border-white/20 px-3.5 py-1.5 text-xs font-bold text-foreground hover:bg-foreground/5 disabled:opacity-60 cursor-pointer"
            >
              <LogOut className="size-3.5" />
              로그아웃
            </button>
          </div>
        </div>
      </div>

      {/* Settings — 테마 + 재생 옵션 (#107) */}
      <div className="mt-3 rounded-xl bg-secondary p-4">
        <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-dim">
          설정
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-foreground">테마</span>
          <ThemeToggle />
        </div>

        <div className="mt-3.5 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-foreground">
            구간 재생 후 자동 멈춤
          </span>
          <SettingSwitch
            checked={autoStopAfterLine}
            onChange={setAutoStopAfterLine}
            label="구간 재생 후 자동 멈춤"
          />
        </div>
      </div>
    </>
  )
}
