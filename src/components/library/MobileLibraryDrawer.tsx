import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { MediaLibrary } from '~/components/library/MediaLibrary'
import { useUiStore } from '~/stores/ui-store'

type Props = {
  userId: string
  onPlay: (params: {
    url: string
    name: string
    mediaType: 'audio' | 'video'
    lrcUrl?: string
  }) => void
}

export function MobileLibraryDrawer({ userId, onPlay }: Props) {
  const isOpen = useUiStore((s) => s.isMobileLibraryOpen)
  const close = useUiStore((s) => s.closeMobileLibrary)

  // MediaLibrary는 한 번 마운트되면 다음 unmount까지 유지해 폴더 이동 같은
  // 내부 상태(currentFolderId)를 닫았다 열어도 보존한다. 단, 데스크톱(≥lg)에서
  // 드로어가 열릴 일은 없으니(트리거가 lg:hidden) 데스크톱에선 인스턴스가
  // 끝까지 마운트되지 않는다 — 같은 페이지에 우측 aside MediaLibrary와 함께
  // 마운트돼 동일 server fn을 병렬 호출하는 race를 피하기 위함이다.
  const [hasOpened, setHasOpened] = useState(false)
  useEffect(() => {
    if (isOpen) setHasOpened(true)
  }, [isOpen])

  // ESC로 닫기 + 열린 동안 body 스크롤 잠금. lg 이상에서는 드로어가 보이지
  // 않으므로 어차피 isOpen이 true여도 시각적 영향은 없지만, 스크롤 잠금까지
  // 켜지면 데스크톱 사용자에게 영향이 가므로 매치미디어로 가드한다.
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

  // 재생 시 드로어 자동 닫힘 — 플레이어 UI에 시야를 넘긴다.
  const handlePlay: Props['onPlay'] = (params) => {
    onPlay(params)
    close()
  }

  return (
    <div
      className={`lg:hidden fixed inset-0 z-50 ${isOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={close}
        aria-label="닫기"
        tabIndex={isOpen ? 0 : -1}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="미디어 라이브러리"
        className={`absolute left-0 top-0 h-full w-[85vw] max-w-sm bg-background border-r shadow-xl flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-end px-2 pt-2">
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          {hasOpened && <MediaLibrary userId={userId} onPlay={handlePlay} />}
        </div>
      </aside>
    </div>
  )
}
