import { useEffect, useState } from 'react'

// Tailwind lg 브레이크포인트(1024px) 이상 여부를 JS로 판정한다.
// CSS `hidden lg:flex` 식 숨김은 컴포넌트를 항상 마운트해 두므로 모바일에서도
// 데스크톱 전용 effect/fetch가 도는 문제가 있다(#118 주석 참고). 마운트 자체를
// 뷰포트로 가르고 싶을 때, 그리고 2단 레이아웃 분기처럼 JS 판정이 필요할 때 쓴다.
export function useIsLgUp(): boolean {
  const [isLgUp, setIsLgUp] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    setIsLgUp(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsLgUp(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isLgUp
}
