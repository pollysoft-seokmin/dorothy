interface DorothyMarkProps {
  size?: number
  className?: string
}

export function DorothyMark({ size = 24, className }: DorothyMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="16" cy="16" r="16" fill="#1DB954" />
      <path
        d="M16 9a3 3 0 00-3 3v4a3 3 0 006 0v-4a3 3 0 00-3-3zM21 15v1a5 5 0 01-10 0v-1M16 21v3M13 24h6"
        stroke="#000"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
