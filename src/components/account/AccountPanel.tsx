import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Check, LogOut, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { authClient, useSession } from '~/lib/auth-client'
import { getStorageUsage } from '~/server/storage'
import { StorageGauge } from '~/components/library/library-atoms'
import { ThemeToggle } from '~/components/theme/ThemeToggle'
import { usePlayerStore } from '~/stores/player-store'
import { cn } from '~/lib/utils'

type Usage = Awaited<ReturnType<typeof getStorageUsage>>

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
  // 모바일 시트와 데스크톱 모달이 콘텐츠(프로필 + 스토리지)를 1:1 공유하므로
  // 한 컴포넌트로 묶는다. 최근 재생은 "내 미디어"의 최근 탭으로 이동했다 (#105).
}

export function AccountPanel({ active, onClose }: AccountPanelProps) {
  const { data, refetch } = useSession()
  const router = useRouter()

  const [usage, setUsage] = useState<Usage | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [savingName, setSavingName] = useState(false)

  const autoStopAfterLine = usePlayerStore((s) => s.autoStopAfterLine)
  const setAutoStopAfterLine = usePlayerStore((s) => s.setAutoStopAfterLine)

  // 패널이 활성(보이는) 상태일 때만 fetch — 닫힌 채로 불필요한 호출을 막는다.
  // 사용자/세션이 바뀌어도 다시 활성화될 때 최신 데이터를 가져온다.
  const userId = data?.user?.id ?? null
  useEffect(() => {
    if (!active || !userId) return
    let cancelled = false
    void getStorageUsage()
      .then((u) => {
        if (!cancelled) setUsage(u)
      })
      .catch(() => {
        // 스토리지 조회 실패는 게이지 "불러오는 중…" 유지로 갈음 — 토스트 남발 회피.
      })
    return () => {
      cancelled = true
    }
  }, [active, userId])

  // 세션이 사라지면(로그아웃 등) 부모를 닫게 한다.
  useEffect(() => {
    if (active && !data?.user) onClose()
  }, [active, data?.user, onClose])

  // 패널이 닫히면 이름 편집 모드를 초기화 — 다시 열 때 항상 보기 상태로.
  useEffect(() => {
    if (!active) setEditingName(false)
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

  const startEditName = () => {
    setNameInput(data?.user?.name ?? '')
    setEditingName(true)
  }

  const saveName = async () => {
    const next = nameInput.trim()
    if (!next || savingName) return
    setSavingName(true)
    try {
      const { error } = await authClient.updateUser({ name: next })
      if (error) {
        toast.error('이름 변경에 실패했습니다')
        return
      }
      await refetch?.()
      setEditingName(false)
      toast.success('이름이 변경되었습니다')
    } catch {
      toast.error('이름 변경에 실패했습니다')
    } finally {
      setSavingName(false)
    }
  }

  if (!data?.user) return null

  // 이름 미설정 시 이메일 @ 앞부분으로 폴백 표시.
  const emailPrefix = (data.user.email ?? '').split('@')[0]
  const displayName = data.user.name?.trim() ? data.user.name : emailPrefix
  const initial = displayName?.[0]?.toUpperCase() ?? 'U'

  return (
    <>
      {/* Profile card — 이름(또는 이메일 prefix) + 이메일, 우측 편집 버튼,
          아래 로그아웃 (#) */}
      <div className="rounded-xl bg-secondary p-4">
        <div className="flex items-center gap-3.5">
          <div
            className="grid shrink-0 place-items-center rounded-full text-xl font-extrabold text-background"
            style={{
              width: 52,
              height: 52,
              background:
                'linear-gradient(135deg, #1DB954 0%, #0E7C39 100%)',
            }}
          >
            {initial}
          </div>

          {editingName ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') setEditingName(false)
              }}
              placeholder="이름"
              className="h-9 min-w-0 flex-1 rounded-md border border-primary-bright bg-accent px-3 text-[15px] font-bold text-foreground placeholder:text-text-dim focus:outline-none"
            />
          ) : (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-bold text-foreground">
                {displayName}
              </div>
              <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {data.user.email}
              </div>
            </div>
          )}

          {editingName ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={saveName}
                disabled={savingName || !nameInput.trim()}
                aria-label="이름 저장"
                className="grid size-8 cursor-pointer place-items-center rounded-full bg-primary-bright text-background hover:bg-primary disabled:opacity-50"
              >
                <Check className="size-4" strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                aria-label="취소"
                className="grid size-8 cursor-pointer place-items-center rounded-full border border-border dark:border-white/20 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditName}
              aria-label="이름 편집"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full border border-border dark:border-white/20 text-foreground hover:bg-foreground/5"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-border dark:border-white/20 py-2 text-xs font-bold text-foreground hover:bg-foreground/5 disabled:opacity-60 cursor-pointer"
        >
          <LogOut className="size-3.5" />
          로그아웃
        </button>
      </div>

      {/* Storage — 내 미디어와 동일한 StorageGauge atom (세그먼트 바 + 범례). */}
      <div className="mt-3 rounded-xl bg-secondary p-4">
        {usage ? (
          <StorageGauge
            used={usage.used}
            quota={usage.quota}
            byType={usage.byType}
          />
        ) : (
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-text-dim">
              스토리지
            </div>
            <div className="font-mono text-[11px] text-text-dim">
              불러오는 중…
            </div>
          </div>
        )}
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
