import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { DorothyMark } from '~/components/brand/DorothyMark'
import { authClient } from '~/lib/auth-client'
import { GoogleSignInButton } from '~/components/auth/GoogleSignInButton'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다')
      return
    }
    setSubmitting(true)
    const { error } = await authClient.signUp.email({
      name: name.trim() || email.split('@')[0],
      email,
      password,
    })
    setSubmitting(false)
    if (error) {
      toast.error(error.message ?? '회원가입에 실패했습니다')
      return
    }
    toast.success('환영합니다!')
    router.navigate({ to: '/' })
  }

  return (
    <main className="relative flex-1 flex items-center justify-center px-4 py-10 overflow-hidden">
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
            회원가입
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            개인화된 재생 환경을 위해 계정을 만드세요.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted-foreground"
            >
              이름
            </label>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="선택"
            />
          </div>
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-text-dim">8자 이상</p>
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full text-base font-extrabold tracking-[-0.01em] hover:bg-primary-bright"
            style={{ height: 52 }}
          >
            {submitting ? '가입 중…' : '가입하기'}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.18em] text-text-dim">
          <span className="h-px flex-1 bg-border" />
          또는
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleSignInButton />

        <p className="text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{' '}
          <Link
            to="/login"
            className="font-bold text-foreground underline-offset-4 hover:underline"
          >
            로그인
          </Link>
        </p>
      </div>
    </main>
  )
}
