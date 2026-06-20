import { createFileRoute } from '@tanstack/react-router'
import { DorothyMark } from '~/components/brand/DorothyMark'
import { GoogleSignInButton } from '~/components/auth/GoogleSignInButton'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10">
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
          <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.03em]">
            로그인
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Google 계정으로 로그인하고 Google Drive 미디어를 사용합니다.
          </p>
        </div>

        <GoogleSignInButton />
      </div>
    </main>
  )
}
