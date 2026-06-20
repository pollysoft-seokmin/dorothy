import { useState, useCallback } from 'react'
import { Slider } from '~/components/ui/slider'

interface ProgressBarProps {
  currentTime: number
  duration: number
  disabled: boolean
  onSeek: (time: number) => void
  // 변환 중이면 진행 게이지를 변환 진행률(0~1)로 재활용한다. 이때 seek 은 막는다.
  isConverting?: boolean
  conversionProgress?: number
}

export function ProgressBar({
  currentTime,
  duration,
  disabled,
  onSeek,
  isConverting = false,
  conversionProgress = 0,
}: ProgressBarProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState(0)

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

  // 변환 중: 게이지를 0~1 정규화 스케일로 두고 진행률을 채운다(seek 비활성).
  // 일반 재생: duration 스케일에 현재 시간(드래그 중이면 드래그 값)을 표시.
  const displayValue = isConverting
    ? conversionProgress
    : isDragging
      ? dragValue
      : currentTime
  const maxValue = isConverting ? 1 : duration || 1

  return (
    <Slider
      min={0}
      max={maxValue}
      step={isConverting ? 0.01 : 0.1}
      value={[displayValue]}
      onValueChange={isConverting ? undefined : handleValueChange}
      onValueCommit={isConverting ? undefined : handleValueCommit}
      disabled={disabled || isConverting}
      aria-label={isConverting ? '변환 진행률' : '재생 위치'}
      className={`w-full ${isConverting ? 'animate-pulse' : ''}`}
    />
  )
}
