import { Play, Pause } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { PlayStatus } from '~/types'

interface PlaybackControlsProps {
  status: PlayStatus
  disabled: boolean
  onPlay: () => void
  onPause: () => void
}

// 72px 흰색 원형 ▶ — 하단 컨트롤 그룹의 시각적 닻. 좌우(Repeat / Expose·
// Language)는 ghost 라서 한 단계 낮은 위계로 정리. 평면 디자인: 그림자/
// scale 인터랙션 없이 색만으로 hover 상태를 표현한다.
export function PlaybackControls({
  status,
  disabled,
  onPlay,
  onPause,
}: PlaybackControlsProps) {
  const isPlaying = status === 'playing'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={isPlaying ? onPause : onPlay}
      aria-label={isPlaying ? '일시정지' : '재생'}
      className={cn(
        'flex h-[72px] w-[72px] items-center justify-center rounded-full',
        'bg-foreground text-background cursor-pointer',
        'hover:bg-foreground/90',
        'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      {isPlaying ? (
        <Pause className="size-7" fill="currentColor" strokeWidth={0} />
      ) : (
        // 시각적 중심 보정: 삼각형은 좌측이 두꺼워 살짝 우측으로 밀어준다.
        <Play
          className="size-7 translate-x-[1px]"
          fill="currentColor"
          strokeWidth={0}
        />
      )}
    </button>
  )
}
