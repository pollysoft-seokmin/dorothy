import { Link, useRouterState } from '@tanstack/react-router'
import { LogIn, Menu } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { DorothyMark } from '~/components/brand/DorothyMark'
import { useSession } from '~/lib/auth-client'
import { useUiStore } from '~/stores/ui-store'

// 데스크톱·모바일 공통 30x30 그린 그라데이션 원형 아바타 + 이니셜.
// 디자인 명세: width/height 30, font 12px, weight 700, color #000,
// linear-gradient(135deg, #1DB954 0%, #0E7C39 100%).
function AccountAvatar({ initial }: { initial: string }) {
  return (
    <span
      aria-hidden
      className="grid size-[30px] shrink-0 place-items-center rounded-full text-xs font-bold text-background"
      style={{
        background: 'linear-gradient(135deg, #1DB954 0%, #0E7C39 100%)',
      }}
    >
      {initial}
    </span>
  )
}

export function AuthHeader() {
  const { data, isPending } = useSession()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const toggleMobileLibrary = useUiStore((s) => s.toggleMobileLibrary)
  const openAccountSheet = useUiStore((s) => s.openAccountSheet)

  // 햄버거는 미디어 라이브러리 드로어를 가진 index 라우트 + 로그인 상태에서만
  // 의미가 있다. 다른 라우트에선 드로어가 마운트되지 않아 클릭해도 아무 일이
  // 일어나지 않으므로 아예 숨긴다.
  const showMobileTrigger = pathname === '/' && !!data?.user

  // 계정 팝업은 /account 풀페이지 이동을 대체. 모바일은 Bottom Sheet, 데스크톱은
  // 중앙 모달이 같은 isAccountSheetOpen 슬라이스로 떠 가사/플레이어 컨텍스트를
  // 유지한다. /account 라우트 자체는 직접 URL 접근용으로 보존.
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
            {/* 모바일: 그린 그라데이션 아바타만 → bottom sheet 트리거. */}
            <button
              type="button"
              onClick={openAccountSheet}
              aria-label={`내 계정 (${data.user.email})`}
              className="lg:hidden cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <AccountAvatar initial={initial} />
            </button>

            {/* 데스크톱: 이메일 텍스트 + 아바타 → 중앙 모달 트리거.
                gap 14px(=gap-3.5), 이메일 13px text-muted-foreground.
                인라인 로그아웃은 모달 내부 프로필 카드로 흡수. */}
            <button
              type="button"
              onClick={openAccountSheet}
              aria-label={`내 계정 (${data.user.email})`}
              className="hidden lg:inline-flex items-center gap-3.5 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="text-[13px] text-muted-foreground transition-colors hover:text-foreground">
                {data.user.email}
              </span>
              <AccountAvatar initial={initial} />
            </button>
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
