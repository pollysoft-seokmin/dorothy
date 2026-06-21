import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useSession } from '~/lib/auth-client'
import { useUiStore } from '~/stores/ui-store'
import { AccountPanel } from './AccountPanel'

// 모바일 전용 — 헤더 우측 아바타 탭으로 하단에서 슬라이드 업.
// 콘텐츠 블록(프로필 + 설정)은 AccountPanel에 위임.
// 데스크톱(≥lg)은 같은 슬라이스(isAccountSheetOpen)로 DesktopAccountModal이 뜬다.
export function MobileAccountSheet() {
  const isOpen = useUiStore((s) => s.isAccountSheetOpen)
  const close = useUiStore((s) => s.closeAccountSheet)
  const { data } = useSession()

  // ESC로 닫기 + 열린 동안 body 스크롤 잠금. 데스크톱 폭(≥lg)에서는 lg:hidden
  // 으로 시트가 보이지 않으므로 매치미디어로 모바일에서만 잠금을 켠다 —
  // 데스크톱 모달은 별도 처리한다.
  useEffect(() => {
    if (!isOpen) return
    const isMobile = window.matchMedia('(max-width: 1023.98px)').matches
    if (!isMobile) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, close])

  if (!data?.user) return null

  return (
    <div
      className={`lg:hidden fixed inset-0 z-50 ${
        isOpen ? '' : 'pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop — 탭하면 닫힘 */}
      <button
        type="button"
        onClick={close}
        aria-label="닫기"
        tabIndex={isOpen ? 0 : -1}
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Sheet */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="내 계정"
        // 닫힘 상태(translate-y-full)에서도 box-shadow 가 위로 새어 모바일
        // 뷰포트 하단에 그라데이션처럼 누수되는 회귀(#88) 회피 — 열렸을 때만 켠다.
        className={`absolute bottom-0 left-0 right-0 flex max-h-[88vh] flex-col rounded-t-[18px] bg-card text-foreground transition-transform duration-250 ease-out ${
          isOpen
            ? 'translate-y-0 shadow-[0_-20px_50px_rgba(0,0,0,0.6)]'
            : 'translate-y-full'
        }`}
      >
        {/* Drag handle (visual only) */}
        <div className="flex justify-center pt-2">
          <div className="h-1 w-9 rounded-full bg-foreground/25" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h2 className="text-lg font-extrabold tracking-[-0.02em]">
            내 계정
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="grid size-8 place-items-center rounded-full bg-foreground/10 text-foreground hover:bg-foreground/15 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable body — 콘텐츠는 AccountPanel에서 단일 source-of-truth */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
          <AccountPanel active={isOpen} onClose={close} />
        </div>

        {/* Safe-area home indicator */}
        <div
          aria-hidden
          className="flex justify-center pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1"
        >
          <div className="h-[5px] w-[134px] rounded-full bg-foreground/50" />
        </div>
      </aside>
    </div>
  )
}
