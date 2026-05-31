import { Link, useRouterState } from '@tanstack/react-router'
import { Library, LogIn, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { DorothyMark } from '~/components/brand/DorothyMark'
import { ThemeToggle } from '~/components/theme/ThemeToggle'
import { useSession } from '~/lib/auth-client'
import { useUiStore } from '~/stores/ui-store'
import { usePlayerStore } from '~/stores/player-store'

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
  const toggleDesktopLibrary = useUiStore((s) => s.toggleDesktopLibrary)
  const openAccountSheet = useUiStore((s) => s.openAccountSheet)
  const requestMediaPick = useUiStore((s) => s.requestMediaPick)

  // 비로그인 + 이미 콘텐츠가 로딩된 경우: 본문의 미디어 추가 안내 대신 상단 "+"
  // 버튼으로 다른 파일을 선택하게 한다 (#105). player-store 는 전역이라 트리와
  // 무관하게 읽을 수 있다.
  const playerFileName = usePlayerStore((s) => s.fileName)
  const showAddMedia = !data?.user && !!playerFileName

  // 라이브러리 토글은 미디어 라이브러리를 가진 index 라우트 + 로그인 상태에서만
  // 의미가 있다. 다른 라우트에선 라이브러리가 마운트되지 않아 클릭해도 아무 일이
  // 일어나지 않으므로 아예 숨긴다. 모바일(햄버거 드로어)/데스크톱(좌측 패널)
  // 양쪽에 같은 조건을 적용한다.
  const showLibraryTrigger = pathname === '/' && !!data?.user

  // 계정은 같은 isAccountSheetOpen 슬라이스로 모바일=Bottom Sheet, 데스크톱=
  // 중앙 모달로 표시. 풀페이지 /account 라우트는 더 이상 존재하지 않는다 (#75).
  const initial = data?.user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <header className="flex items-center justify-between px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        {showLibraryTrigger && (
          <>
            {/* 모바일: 내 미디어 아이콘 → bottom sheet 드로어 토글. */}
            <button
              type="button"
              onClick={toggleMobileLibrary}
              className="lg:hidden -ml-1 p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="미디어 라이브러리 열기"
            >
              <Library className="size-5" />
            </button>
            {/* 데스크톱: Library 아이콘 → 좌측 "내 미디어" 패널 표시/숨김 토글 (#100). */}
            <button
              type="button"
              onClick={toggleDesktopLibrary}
              className="hidden lg:inline-flex -ml-1 p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="내 미디어 패널 토글"
            >
              <Library className="size-5" />
            </button>
          </>
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
        {/* 테마 선택 — 데스크톱 툴바에 항상 노출(로그인 무관). */}
        <div className="hidden lg:flex">
          <ThemeToggle />
        </div>
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

            {/* 데스크톱: 이메일 텍스트 + 아바타 → 중앙 모달 트리거 (모바일과
                같은 슬라이스, 다른 chrome). 인라인 로그아웃은 모달 내부 프로필
                카드로 흡수. */}
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
          <>
            {/* 콘텐츠 로딩 시: 로그인 버튼 왼쪽 "+" 로 다른 미디어 선택 (#105). */}
            {showAddMedia && (
              <button
                type="button"
                onClick={requestMediaPick}
                aria-label="미디어 추가"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <Plus className="size-5" />
              </button>
            )}
            <Button asChild size="sm" variant="outline">
              <Link to="/login">
                <LogIn className="size-4" />
                <span>로그인</span>
              </Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
