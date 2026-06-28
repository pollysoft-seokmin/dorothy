import { useCallback, useEffect, useState, type RefObject } from 'react'

// 브라우저 Fullscreen API 래퍼. ref 로 받은 엘리먼트를 전체화면으로 띄우고,
// fullscreenchange 이벤트로 현재 상태를 동기화한다. 전체화면은 DOM 위치를 옮기지
// 않고 기존 엘리먼트를 그대로 확대하므로, 안에 있는 <video> 가 재마운트되지 않아
// 재생이 끊기지 않는다. Safari(webkit) 프리픽스도 함께 처리한다.
interface FullscreenDoc extends Document {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => void
}
interface FullscreenEl extends HTMLElement {
  webkitRequestFullscreen?: () => void
}

function currentFullscreenElement(): Element | null {
  const d = document as FullscreenDoc
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null
}

export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(currentFullscreenElement() === ref.current)
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [ref])

  const toggle = useCallback(() => {
    const el = ref.current as FullscreenEl | null
    if (!el) return
    if (currentFullscreenElement()) {
      const d = document as FullscreenDoc
      if (d.exitFullscreen) void d.exitFullscreen()
      else d.webkitExitFullscreen?.()
    } else {
      if (el.requestFullscreen) void el.requestFullscreen()
      else el.webkitRequestFullscreen?.()
    }
  }, [ref])

  return { isFullscreen, toggle }
}
