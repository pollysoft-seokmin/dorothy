import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LogOut, Pencil } from 'lucide-react'
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

// 이름 변경 팝업 — 오버레이 + 중앙 카드. 계정 모달(z-50) 위에 뜨도록 z-[60].
function NameEditDialog({
  open,
  initialName,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean
  initialName: string
  submitting: boolean
  onClose: () => void
  onSubmit: (name: string) => void
}) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  if (!open) return null

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* 클릭-아웃 닫기용 투명 오버레이. 계정 모달 위에 딤/블러를 덧대면 흰
          카드가 프로스티드 사각형으로 떠 보여(라이트 테마) 어색하므로, 추가
          스크림 없이 팝업 카드의 그림자만으로 부각시킨다. */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="이름 변경"
        className="relative w-full max-w-xs rounded-2xl border border-border bg-card p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
      >
        <h2 className="text-base font-extrabold tracking-[-0.02em] text-foreground">
          이름 변경
        </h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onClose()
          }}
          placeholder="이름"
          className="mt-3.5 h-11 w-full rounded-full border border-border bg-accent px-4 text-sm font-semibold text-foreground placeholder:text-text-dim focus:border-primary-bright focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !name.trim()}
            className="cursor-pointer rounded-full bg-primary-bright px-5 py-2 text-sm font-extrabold text-background hover:bg-primary disabled:opacity-50"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  )
}

interface AccountPanelProps {
  // 부모(시트/모달)가 보일 때만 true. fetch 게이트 + 세션 로그아웃 시 onClose 가드.
  active: boolean
  onClose: () => void
}

export function AccountPanel({ active, onClose }: AccountPanelProps) {
  const { data, refetch } = useSession()
  const router = useRouter()

  const [signingOut, setSigningOut] = useState(false)
  const [nameDialogOpen, setNameDialogOpen] = useState(false)
  const [savingName, setSavingName] = useState(false)

  const autoStopAfterLine = usePlayerStore((s) => s.autoStopAfterLine)
  const setAutoStopAfterLine = usePlayerStore((s) => s.setAutoStopAfterLine)

  // 세션이 사라지면(로그아웃 등) 부모를 닫게 한다.
  useEffect(() => {
    if (active && !data?.user) onClose()
  }, [active, data?.user, onClose])

  // 패널이 닫히면 이름 편집 팝업을 닫는다 — 다시 열 때 항상 보기 상태로.
  useEffect(() => {
    if (!active) setNameDialogOpen(false)
  }, [active])

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

  const saveName = async (next: string) => {
    const name = next.trim()
    if (!name || savingName) return
    setSavingName(true)
    try {
      const { error } = await authClient.updateUser({ name })
      if (error) {
        toast.error('이름 변경에 실패했습니다')
        return
      }
      await refetch?.()
      setNameDialogOpen(false)
      toast.success('이름이 변경되었습니다')
    } catch {
      toast.error('이름 변경에 실패했습니다')
    } finally {
      setSavingName(false)
    }
  }

  if (!data?.user) return null

  // 이름 미설정 시 이메일 @ 앞부분 CamelCase 로 폴백 — 타이틀과 동일 (#114).
  const displayName = deriveDisplayName(data.user)
  const initial = displayName[0]?.toUpperCase() ?? 'U'
  const avatarBg = avatarColor(data.user.email ?? '')

  return (
    <>
      {/* Profile card — 이름(또는 이메일 prefix) + 이메일, 우측 편집 버튼.
          로그아웃은 이름/이메일과 좌측 정렬(아바타 우측 컬럼 내부) (#113) */}
      <div className="rounded-xl bg-secondary p-4">
        <div className="flex items-start gap-3.5">
          <div
            className="grid shrink-0 place-items-center rounded-full text-xl font-extrabold text-white"
            style={{ width: 52, height: 52, background: avatarBg }}
          >
            {initial}
          </div>

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

          <button
            type="button"
            onClick={() => setNameDialogOpen(true)}
            aria-label="이름 편집"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border dark:border-white/20 text-foreground hover:bg-foreground/5"
          >
            <Pencil className="size-3.5" />
          </button>
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

      <NameEditDialog
        open={nameDialogOpen}
        initialName={data.user.name ?? ''}
        submitting={savingName}
        onClose={() => setNameDialogOpen(false)}
        onSubmit={saveName}
      />
    </>
  )
}
