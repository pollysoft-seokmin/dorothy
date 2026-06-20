import { formatTime } from '~/lib/format-time'

interface TimeDisplayProps {
  currentTime: number
  duration: number
  // 변환 중이면 현재 시간 자리에 변환 진행 %를 표시한다.
  isConverting?: boolean
  conversionProgress?: number
}

export function TimeDisplay({
  currentTime,
  duration,
  isConverting = false,
  conversionProgress = 0,
}: TimeDisplayProps) {
  return (
    <div className="flex justify-between text-xs text-muted-foreground tabular-nums px-0.5">
      {isConverting ? (
        <>
          <span>{Math.round(conversionProgress * 100)}%</span>
          <span>변환 중</span>
        </>
      ) : (
        <>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </>
      )}
    </div>
  )
}
