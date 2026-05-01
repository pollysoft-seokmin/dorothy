import { useState, useCallback } from 'react'
import { Slider } from '~/components/ui/slider'

interface ProgressBarProps {
  currentTime: number
  duration: number
  disabled: boolean
  onSeek: (time: number) => void
}

export function ProgressBar({
  currentTime,
  duration,
  disabled,
  onSeek,
}: ProgressBarProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState(0)

  const displayValue = isDragging ? dragValue : currentTime
  const maxValue = duration || 1

  const handleValueChange = useCallback((values: number[]) => {
    setDragValue(values[0])
    setIsDragging(true)
  }, [])

  const handleValueCommit = useCallback(
    (values: number[]) => {
      onSeek(values[0])
      setIsDragging(false)
    },
    [onSeek],
  )

  return (
    <Slider
      min={0}
      max={maxValue}
      step={0.1}
      value={[displayValue]}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      disabled={disabled}
      aria-label="재생 위치"
      className="w-full"
    />
  )
}
