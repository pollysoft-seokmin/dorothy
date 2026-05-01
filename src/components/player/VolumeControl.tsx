import { Volume, Volume1, Volume2, VolumeX } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Slider } from '~/components/ui/slider'

interface VolumeControlProps {
  volume: number
  isMuted: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
}

export function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeControlProps) {
  const displayVolume = isMuted ? 0 : volume
  const volumePercent = Math.round(displayVolume * 100)

  function getIcon() {
    if (isMuted) return <VolumeX className="h-4 w-4" />
    if (volume === 0) return <Volume className="h-4 w-4" />
    if (volumePercent <= 50) return <Volume1 className="h-4 w-4" />
    return <Volume2 className="h-4 w-4" />
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleMute}
        aria-label="음소거 토글"
        className="shrink-0"
      >
        {getIcon()}
      </Button>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[volumePercent]}
        onValueChange={(values) => onVolumeChange(values[0] / 100)}
        aria-label="볼륨"
        className="w-24"
      />
    </div>
  )
}
