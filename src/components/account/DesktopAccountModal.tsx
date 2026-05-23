import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useSession } from '~/lib/auth-client'
import { useUiStore } from '~/stores/ui-store'
import { AccountPanel } from './AccountPanel'

// 데스크톱 전용 — 헤더 이메일/아바타 클릭으로 가운데 중앙 모달이 dim + blur
// 백드롭과 함께 페이드 인. 모바일 시트와 같은 isAccountSheetOpen 슬라이스로
// 제어되며, lg 이상에서만 visible — 한 시점에 시트와 모달이 동시에 보일 수
// 없으므로 슬라이스 분리는 불필요.
//
// 콘텐츠(프로필 + 스토리지 + 최근 재생)는 AccountPanel에서 1:1 동일 — 모바일
// Bottom Sheet와 동일 컨텐츠를 다른 chrome으로 감싸기만 한다.
export function DesktopAccountModal() {
  const isOpen = useUiStore((s) => s.isAccountSheetOpen)
  const close = useUiStore((s) => s.closeAccountSheet)
  const { data } = useSession()

  // ESC로 닫기 + 열린 동안 body 스크롤 잠금. 모바일(<lg) 폭에서는 hidden
  // lg:flex로 모달이 보이지 않으므로 매치미디어로 데스크톱에서만 잠근다.
  useEffect(() => {
    if (!isOpen) return
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    if (!isDesktop) return

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
      className={`hidden lg:flex fixed inset-0 z-50 items-center justify-center transition-opacity duration-200 ${
        isOpen
          ? 'opacity-100'
          : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isOpen}
    >
      {/* Backdrop — dim + blur */}
      <button
        type="button"
        onClick={close}
        aria-label="닫기"
        tabIndex={isOpen ? 0 : -1}
        className="absolute inset-0 bg-black/55 backdrop-blur-[4px]"
      />

      {/* Centered modal — 440 x 680 max, radius 16 */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="내 계정"
        className={`relative flex w-[440px] max-h-[680px] flex-col rounded-2xl border border-white/[0.06] bg-card text-foreground shadow-[0_30px_80px_rgba(0,0,0,0.6)] transition-transform duration-200 ease-out ${
          isOpen ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Header — drag handle 대신 제목 + close */}
        <div className="flex items-center justify-between px-[22px] pt-[18px] pb-2.5">
          <h2 className="text-[19px] font-extrabold tracking-[-0.02em]">
            내 계정
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="grid size-8 place-items-center rounded-full bg-white/10 text-foreground hover:bg-white/15 cursor-pointer"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-[22px] pb-5">
          <AccountPanel active={isOpen} onClose={close} />
        </div>
      </div>
    </div>
  )
}
