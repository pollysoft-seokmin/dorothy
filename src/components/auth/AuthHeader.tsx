import { Link, useRouter, useRouterState } from '@tanstack/react-router'
import { LogIn, LogOut, Menu, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { DorothyMark } from '~/components/brand/DorothyMark'
import { authClient, useSession } from '~/lib/auth-client'
import { useUiStore } from '~/stores/ui-store'

export function AuthHeader() {
  const { data, isPending } = useSession()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const toggleMobileLibrary = useUiStore((s) => s.toggleMobileLibrary)
  const openAccountSheet = useUiStore((s) => s.openAccountSheet)

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

  // 모바일 계정 시트는 /account를 대체. 풀페이지 이동 대신 bottom sheet로 띄워
  // 가사/플레이어 컨텍스트를 유지한다. /account 라우트 자체는 데스크톱용으로
  // 보존(직접 URL 입력 + 큰 화면 모두 자연스러움).
  const initial = data?.user?.email?.[0]?.toUpperCase() ?? '?'

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
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-extrabold tracking-tight -tracking-[0.02em]"
        >
          <DorothyMark size={22} />
          <span>Dorothy</span>
        </Link>
      </div>
      <div className="flex items-center gap-2 text-sm">
        {isPending ? (
          <span className="text-muted-foreground">…</span>
        ) : data?.user ? (
          <>
            {/* 모바일: 그린 그라데이션 아바타 → bottom sheet 트리거.
                lg:hidden 으로 데스크톱에서는 숨김. */}
            <button
              type="button"
              onClick={openAccountSheet}
              aria-label={`내 계정 (${data.user.email})`}
              className="lg:hidden grid size-8 cursor-pointer place-items-center rounded-full text-xs font-extrabold text-background"
              style={{
                background:
                  'linear-gradient(135deg, #1DB954 0%, #0E7C39 100%)',
              }}
            >
              {initial}
            </button>

            {/* 데스크톱: 종전 /account 풀페이지 + 인라인 로그아웃 유지. */}
            <Link
              to="/account"
              className="hidden lg:inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <UserRound className="size-4" />
              <span>{data.user.email}</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="hidden lg:inline-flex"
            >
              <LogOut className="size-4" />
              <span>로그아웃</span>
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
