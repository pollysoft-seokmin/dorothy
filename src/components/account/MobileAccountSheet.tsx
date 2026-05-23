import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LogOut, X, Music, Film } from 'lucide-react'
import { toast } from 'sonner'
import { authClient, useSession } from '~/lib/auth-client'
import { useUiStore } from '~/stores/ui-store'
import { usePlayerStore } from '~/stores/player-store'
import { NowPlayingBars } from '~/components/library/NowPlayingBars'
import { getRecentPlaybacks } from '~/server/personalization'
import { getStorageUsage } from '~/server/storage'

type Playback = Awaited<ReturnType<typeof getRecentPlaybacks>>[number]

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

// "lastPlayedAt"을 한국어 상대 시간으로. 시트 안에서만 쓰이고 매우 좁은 의미라
// 외부 의존성 없이 인라인으로 둔다.
function formatRelativeTime(at: Date | string): string {
  const ts = typeof at === 'string' ? new Date(at) : at
  const diffSec = Math.max(0, (Date.now() - ts.getTime()) / 1000)
  if (diffSec < 60) return '방금 전'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`
  if (diffSec < 86400 * 2) return '어제'
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`
  return ts.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

export function MobileAccountSheet() {
  const isOpen = useUiStore((s) => s.isAccountSheetOpen)
  const close = useUiStore((s) => s.closeAccountSheet)
  const { data } = useSession()
  const router = useRouter()
  const playingFileName = usePlayerStore((s) => s.fileName)
  const playStatus = usePlayerStore((s) => s.status)

  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(
    null,
  )
  const [history, setHistory] = useState<Playback[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  // 시트가 열릴 때만 fetch — 모달 닫힌 채로 불필요한 호출을 막는다.
  // 사용자/세션이 바뀌어도 다시 열 때 최신 데이터를 가져온다.
  const userId = data?.user?.id ?? null
  useEffect(() => {
    if (!isOpen || !userId) return
    let cancelled = false
    setHistoryError(null)
    void Promise.all([getRecentPlaybacks(), getStorageUsage()])
      .then(([rows, u]) => {
        if (cancelled) return
        setHistory(rows)
        setUsage(u)
      })
      .catch((e) => {
        if (cancelled) return
        setHistoryError(e instanceof Error ? e.message : 'unknown error')
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, userId])

  // ESC로 닫기 + 열린 동안 body 스크롤 잠금. 데스크톱 폭(≥lg)에서는 lg:hidden
  // 으로 시트가 보이지 않으므로 스크롤 잠금까지 켜지면 데스크톱 사용자에게
  // 영향이 가서 매치미디어로 가드한다. — MobileLibraryDrawer와 동일 패턴.
  useEffect(() => {
    if (!isOpen) return
    const isMobile = window.matchMedia('(max-width: 1023.98px)').matches
    if (!isMobile) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, close])

  // 세션이 사라지면(로그아웃 등) 자동 닫힘
  useEffect(() => {
    if (isOpen && !data?.user) close()
  }, [isOpen, data?.user, close])

  const handleSignOut = async () => {
    setSigningOut(true)
    const { error } = await authClient.signOut()
    setSigningOut(false)
    if (error) {
      toast.error('로그아웃에 실패했습니다')
      return
    }
    toast.success('로그아웃되었습니다')
    close()
    router.invalidate()
  }

  if (!data?.user) return null

  const initial = data.user.email?.[0]?.toUpperCase() ?? 'U'
  const usageRatio = usage ? Math.min(1, usage.used / usage.quota) : 0

  return (
    <div
      // 데스크톱(≥lg)에서는 헤더의 /account 링크가 그대로 동작하므로 시트
      // 자체를 숨긴다. trigger가 lg:hidden, 시트 root도 lg:hidden.
      className={`lg:hidden fixed inset-0 z-50 ${
        isOpen ? '' : 'pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop — 탭하면 닫힘. fade 트랜지션. */}
      <button
        type="button"
        onClick={close}
        aria-label="닫기"
        tabIndex={isOpen ? 0 : -1}
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet — 하단에서 슬라이드 업 */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="내 계정"
        className={`absolute bottom-0 left-0 right-0 flex max-h-[88vh] flex-col rounded-t-[18px] bg-card text-foreground shadow-[0_-20px_50px_rgba(0,0,0,0.6)] transition-transform duration-250 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle (visual only — 실제 드래그 dismiss는 별도 작업) */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-white/25" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-lg font-extrabold tracking-[-0.02em]">
            내 계정
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="grid size-8 place-items-center rounded-full bg-white/10 text-foreground hover:bg-white/15 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
          {/* Profile card */}
          <div className="flex items-center gap-3.5 rounded-xl bg-secondary p-4">
            <div
              className="grid size-13 shrink-0 place-items-center rounded-full text-xl font-extrabold text-background"
              style={{
                width: 52,
                height: 52,
                background:
                  'linear-gradient(135deg, #1DB954 0%, #0E7C39 100%)',
              }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
                이메일
              </div>
              <div className="mt-0.5 truncate text-[15px] font-bold">
                {data.user.email}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-2 text-xs font-bold text-foreground hover:bg-white/5 disabled:opacity-60 cursor-pointer"
            >
              <LogOut className="size-3.5" />
              로그아웃
            </button>
          </div>

          {/* Storage gauge mini */}
          <div className="mt-3 rounded-xl bg-secondary p-4">
            <div className="flex items-baseline justify-between">
              <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
                스토리지
              </div>
              <div className="font-mono text-xs">
                {usage ? (
                  <>
                    {formatBytes(usage.used)}
                    <span className="text-text-dim">
                      {' '}
                      / {formatBytes(usage.quota)}
                    </span>
                  </>
                ) : (
                  <span className="text-text-dim">불러오는 중…</span>
                )}
              </div>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-accent">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  usageRatio > 0.9 ? 'bg-destructive' : 'bg-primary-bright'
                }`}
                style={{ width: `${usageRatio * 100}%` }}
              />
            </div>
          </div>

          {/* Recent playback */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">
              최근 재생
            </div>
            <div className="text-[11px] text-text-dim">
              {history?.length ?? 0}개
            </div>
          </div>

          <div className="mt-1">
            {historyError ? (
              <p className="py-6 text-center text-sm text-destructive">
                불러오기 실패: {historyError}
              </p>
            ) : history === null ? (
              <p className="py-6 text-center text-sm text-text-dim">
                불러오는 중…
              </p>
            ) : history.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-dim">
                아직 재생 이력이 없습니다.
              </p>
            ) : (
              <ul>
                {history.map((row) => {
                  const isPlaying =
                    row.fileName === playingFileName &&
                    playStatus === 'playing'
                  const isActive = row.fileName === playingFileName
                  const isVideo = /\.(mp4|webm|mov|mpg|mpeg|m4v|avi|mkv)$/i.test(
                    row.fileName,
                  )
                  const Icon = isVideo ? Film : Music
                  return (
                    <li
                      key={row.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <div className="grid size-10 shrink-0 place-items-center rounded bg-accent">
                        {isPlaying ? (
                          <NowPlayingBars playing size={16} />
                        ) : (
                          <Icon
                            className={`size-4.5 ${
                              isActive
                                ? 'text-primary-bright'
                                : 'text-muted-foreground'
                            }`}
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`truncate text-sm font-bold tracking-[-0.01em] ${
                            isActive ? 'text-primary-bright' : 'text-foreground'
                          }`}
                          title={row.title ?? row.fileName}
                        >
                          {row.title ?? row.fileName}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {row.artist ?? '—'}
                          {' · '}
                          <span className="text-text-dim">
                            {formatRelativeTime(row.lastPlayedAt)}
                          </span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Safe-area home indicator */}
        <div
          aria-hidden
          className="flex justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1"
        >
          <div className="h-[5px] w-[134px] rounded-full bg-white/50" />
        </div>
      </aside>
    </div>
  )
}
