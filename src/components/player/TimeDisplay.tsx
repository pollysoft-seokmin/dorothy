import { formatTime } from '~/lib/format-time'

interface TimeDisplayProps {
  currentTime: number
  duration: number
}

export function TimeDisplay({ currentTime, duration }: TimeDisplayProps) {
  return (
    <div className="flex justify-between text-xs text-muted-foreground tabular-nums px-0.5">
      <span>{formatTime(currentTime)}</span>
      <span>/ {formatTime(duration)}</span>
    </div>
  )
}
