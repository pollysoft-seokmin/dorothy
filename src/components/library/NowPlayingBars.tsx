// 라이브러리 row가 현재 재생 중일 때 표시되는 4개 막대 그래프.
// 재생 중이면 막대가 박자에 맞춰 위아래로 움직이고, 일시정지에서는 정지.
interface NowPlayingBarsProps {
  playing?: boolean
  size?: number
}

export function NowPlayingBars({ playing = true, size = 14 }: NowPlayingBarsProps) {
  return (
    <span
      className="flex items-end gap-[2px] shrink-0"
      style={{ height: size, width: size + 4 }}
      aria-hidden
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[2px] bg-primary-bright rounded-sm origin-bottom"
          style={{
            height: '100%',
            animation: playing
              ? `npb-bounce 0.9s ease-in-out ${i * 0.15}s infinite`
              : 'none',
            transform: playing ? undefined : 'scaleY(0.35)',
          }}
        />
      ))}
      <style>{`
        @keyframes npb-bounce {
          0%, 100% { transform: scaleY(0.35); }
          50%      { transform: scaleY(1); }
        }
      `}</style>
    </span>
  )
}
