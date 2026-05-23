import { useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LogOut, Music, Film } from 'lucide-react'
import { toast } from 'sonner'
import { authClient, useSession } from '~/lib/auth-client'
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

// "lastPlayedAt"을 한국어 상대 시간으로. 매우 좁은 의미라 외부 의존성 없이 인라인.
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

interface AccountPanelProps {
  // 부모(시트/모달)가 보일 때만 true. fetch 게이트 + 세션 로그아웃 시 onClose 가드.
  active: boolean
  onClose: () => void
  // 모바일 시트는 가운데 정렬 padding이 다르고 footer에 home indicator가 들어가지만,
  // 콘텐츠 자체(프로필 + 스토리지 + 최근 재생)는 1:1 동일하므로 한 컴포넌트로 묶는다.
}

export function AccountPanel({ active, onClose }: AccountPanelProps) {
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

  // 패널이 활성(보이는) 상태일 때만 fetch — 닫힌 채로 불필요한 호출을 막는다.
  // 사용자/세션이 바뀌어도 다시 활성화될 때 최신 데이터를 가져온다.
  const userId = data?.user?.id ?? null
  useEffect(() => {
    if (!active || !userId) return
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
  }, [active, userId])

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

  const initial = data.user.email?.[0]?.toUpperCase() ?? 'U'
  const usageRatio = usage ? Math.min(1, usage.used / usage.quota) : 0

  return (
    <>
      {/* Profile card */}
      <div className="flex items-center gap-3.5 rounded-xl bg-secondary p-4">
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
                row.fileName === playingFileName && playStatus === 'playing'
              const isActive = row.fileName === playingFileName
              const isVideo = /\.(mp4|webm|mov|mpg|mpeg|m4v|avi|mkv)$/i.test(
                row.fileName,
              )
              const Icon = isVideo ? Film : Music
              return (
                <li key={row.id} className="flex items-center gap-3 py-2.5">
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
    </>
  )
}
