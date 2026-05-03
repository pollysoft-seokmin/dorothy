import { Link, useRouter } from '@tanstack/react-router'
import { LogIn, LogOut, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { authClient, useSession } from '~/lib/auth-client'

export function AuthHeader() {
  const { data, isPending } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    const { error } = await authClient.signOut()
    if (error) {
      toast.error('로그아웃에 실패했습니다')
      return
    }
    toast.success('로그아웃되었습니다')
    router.invalidate()
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 sm:px-6">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        Dorothy
      </Link>
      <div className="flex items-center gap-2 text-sm">
        {isPending ? (
          <span className="text-muted-foreground">…</span>
        ) : data?.user ? (
          <>
            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <UserRound className="size-4" />
              <span className="hidden sm:inline">{data.user.email}</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">로그아웃</span>
            </Button>
          </>
        ) : (
          <Button asChild size="sm" variant="outline">
            <Link to="/login">
              <LogIn className="size-4" />
              <span>로그인</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}
