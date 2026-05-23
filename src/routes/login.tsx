import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { DorothyMark } from '~/components/brand/DorothyMark'
import { authClient } from '~/lib/auth-client'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await authClient.signIn.email({ email, password })
    setSubmitting(false)
    if (error) {
      toast.error(error.message ?? '로그인에 실패했습니다')
      return
    }
    toast.success('로그인되었습니다')
    router.navigate({ to: '/' })
  }

  const onGoogle = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    })
  }

  return (
    <main className="relative flex-1 flex items-center justify-center px-4 py-10 overflow-hidden">
      {/* 상단 그린 ambient — Spotify의 로그인 ambient 패턴 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 10%, rgba(29,185,84,0.22) 0%, rgba(0,0,0,0) 100%)',
        }}
      />

      <div className="relative w-full max-w-sm space-y-7">
        <div className="flex items-center gap-3">
          <DorothyMark size={36} />
          <span className="text-xl font-extrabold tracking-[-0.02em]">
            Dorothy
          </span>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] leading-tight">
            로그인
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            이메일 또는 Google 계정으로 계속하세요.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground"
            >
              이메일
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground"
            >
              비밀번호
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-13 rounded-full text-base font-extrabold tracking-[-0.01em] hover:bg-primary-bright"
            style={{ height: 52 }}
          >
            {submitting ? '로그인 중…' : '로그인'}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-text-dim">
          <span className="h-px flex-1 bg-border" />
          또는
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={onGoogle}
          className="flex w-full items-center justify-center gap-2.5 rounded-full border border-white/30 text-sm font-bold text-foreground transition-colors hover:bg-white/5 cursor-pointer"
          style={{ height: 52 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
            <path
              d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"
              fill="#4285F4"
            />
            <path
              d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"
              fill="#34A853"
            />
            <path
              d="M4.5 10.48a4.8 4.8 0 010-3.07V5.34H1.83a8 8 0 000 7.15l2.67-2.01z"
              fill="#FBBC05"
            />
            <path
              d="M8.98 4.18c1.18 0 2.23.4 3.06 1.2l2.31-2.3A8 8 0 001.83 5.35L4.5 7.4a4.77 4.77 0 014.48-3.22z"
              fill="#EA4335"
            />
          </svg>
          Google로 계속하기
        </button>

        <p className="text-center text-sm text-muted-foreground">
          계정이 없으신가요?{' '}
          <Link
            to="/signup"
            className="font-bold text-foreground underline-offset-4 hover:underline"
          >
            회원가입
          </Link>
        </p>
      </div>
    </main>
  )
}
