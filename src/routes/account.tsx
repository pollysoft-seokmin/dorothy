import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useSession } from '~/lib/auth-client'
import { getRecentPlaybacks } from '~/server/personalization'

export const Route = createFileRoute('/account')({
  component: AccountPage,
})

type Playback = Awaited<ReturnType<typeof getRecentPlaybacks>>[number]

function AccountPage() {
  const { data, isPending } = useSession()
  const navigate = useNavigate()
  const [history, setHistory] = useState<Playback[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !data?.user) {
      navigate({ to: '/login' })
    }
  }, [isPending, data, navigate])

  useEffect(() => {
    if (!data?.user) return
    let cancelled = false
    getRecentPlaybacks()
      .then((rows) => {
        if (!cancelled) setHistory(rows)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'unknown error')
      })
    return () => {
      cancelled = true
    }
  }, [data?.user])

  if (isPending || !data?.user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">불러오는 중…</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">내 계정</h1>

      <section className="rounded-lg border p-4 space-y-1">
        <p className="text-sm text-muted-foreground">이메일</p>
        <p className="font-medium">{data.user.email}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">최근 재생</h2>
        {error ? (
          <p className="text-sm text-destructive">불러오기 실패: {error}</p>
        ) : history === null ? (
          <p className="text-sm text-muted-foreground">불러오는 중…</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 재생 이력이 없습니다.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {history.map((row) => (
              <li key={row.id} className="px-4 py-3 text-sm">
                <p className="font-medium truncate">
                  {row.title ?? row.fileName}
                </p>
                <p className="text-muted-foreground truncate">
                  {row.artist ?? '—'}
                  {' · '}
                  {new Date(row.lastPlayedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
