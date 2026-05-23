import { Play, Pause } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { PlayStatus } from '~/types'

interface PlaybackControlsProps {
  status: PlayStatus
  disabled: boolean
  onPlay: () => void
  onPause: () => void
}

// 72px 흰색 원형 ▶ — Spotify의 시각적 닻 패턴. 하단 컨트롤 그룹에서 중앙에
// 무게중심을 두고, 좌우(Repeat / Expose·Language)는 회색 ghost로 한 단계
// 낮춰 위계를 정리한다.
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
        'bg-foreground text-background shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
        'transition-transform duration-150 ease-out cursor-pointer',
        'hover:scale-[1.04] active:scale-[0.96]',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100',
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
