import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { LogIn, LogOut, Menu, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { authClient, useSession } from '~/lib/auth-client'
import { useUiStore } from '~/stores/ui-store'

export function AuthHeader() {
  const { data, isPending } = useSession()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const toggleMobileLibrary = useUiStore((s) => s.toggleMobileLibrary)

  const handleSignOut = async () => {
    const { error } = await authClient.signOut()
    if (error) {
      toast.error('로그아웃에 실패했습니다')
      return
    }
    toast.success('로그아웃되었습니다')
    router.invalidate()
  }

  // 햄버거는 미디어 라이브러리 드로어를 가진 index 라우트 + 로그인 상태에서만
  // 의미가 있다. 다른 라우트에선 드로어가 마운트되지 않아 클릭해도 아무 일이
  // 일어나지 않으므로 아예 숨긴다.
  const showMobileTrigger = pathname === '/' && !!data?.user

  return (
    <header className="flex items-center justify-between px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        {showMobileTrigger && (
          <button
            type="button"
            onClick={toggleMobileLibrary}
            className="lg:hidden -ml-1 p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="미디어 라이브러리 열기"
          >
            <Menu className="size-5" />
          </button>
        )}
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Dorothy
        </Link>
      </div>
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
