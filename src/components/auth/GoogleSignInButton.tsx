import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { authClient } from '~/lib/auth-client'

type ProviderConfig = {
  google: boolean
}

export function GoogleSignInButton() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadProviderConfig = async () => {
      try {
        const response = await fetch('/api/auth/providers')
        if (!response.ok) throw new Error('Failed to load auth providers')
        const config = (await response.json()) as ProviderConfig
        if (!cancelled) setEnabled(config.google)
      } catch {
        if (!cancelled) setEnabled(false)
      }
    }

    void loadProviderConfig()

    return () => {
      cancelled = true
    }
  }, [])

  const onGoogle = async () => {
    if (!enabled) {
      toast.error('Google 로그인이 아직 설정되지 않았습니다')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      })
      if (error) {
        toast.error(error.message ?? 'Google 로그인에 실패했습니다')
      }
    } catch {
      toast.error('Google 로그인에 실패했습니다')
    } finally {
      setSubmitting(false)
    }
  }

  const disabled = enabled !== true || submitting

  return (
    <button
      type="button"
      onClick={onGoogle}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-2.5 rounded-full border border-white/30 text-sm font-bold text-foreground transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer"
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
      {submitting ? 'Google로 이동 중...' : 'Google로 계속하기'}
    </button>
  )
}
