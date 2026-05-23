// Inline SVG icons matching lucide-react usage in the codebase.
// Stroke-based, 24x24 viewBox, currentColor — same vibe as Lucide.

const Icon = ({ d, size = 20, fill = 'none', stroke = 'currentColor', strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  Play: ({ size = 20, fill = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}><path d="M8 5v14l11-7z" /></svg>
  ),
  Pause: ({ size = 20, fill = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
  ),
  Repeat: ({ size = 20 }) => (
    <Icon size={size} d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
  ),
  Menu: ({ size = 20 }) => (
    <Icon size={size} d="M3 6h18M3 12h18M3 18h18" />
  ),
  Music: ({ size = 20 }) => (
    <Icon size={size} d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z" />
  ),
  Mic: ({ size = 20 }) => (
    <Icon size={size} d="M12 2a3 3 0 00-3 3v6a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" />
  ),
  Film: ({ size = 20 }) => (
    <Icon size={size} d="M3 3h18v18H3zM7 3v18M17 3v18M3 7.5h4M3 12h4M3 16.5h4M17 7.5h4M17 12h4M17 16.5h4" />
  ),
  Folder: ({ size = 20 }) => (
    <Icon size={size} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  ),
  Upload: ({ size = 20 }) => (
    <Icon size={size} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  ),
  FileText: ({ size = 20 }) => (
    <Icon size={size} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" />
  ),
  Search: ({ size = 20 }) => (
    <Icon size={size} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
  ),
  Home: ({ size = 20 }) => (
    <Icon size={size} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-7h4v7h4a1 1 0 001-1V10" />
  ),
  Library: ({ size = 20 }) => (
    <Icon size={size} d="M16 6l4 14M12 6v14M8 8v12M4 4v16" />
  ),
  Plus: ({ size = 20 }) => (
    <Icon size={size} d="M12 5v14M5 12h14" />
  ),
  Heart: ({ size = 20, fill = 'none' }) => (
    <Icon size={size} fill={fill} d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
  ),
  MoreH: ({ size = 20 }) => (
    <Icon size={size} fill="currentColor" stroke="none" d="M12 14a2 2 0 110-4 2 2 0 010 4zM5 14a2 2 0 110-4 2 2 0 010 4zM19 14a2 2 0 110-4 2 2 0 010 4z" />
  ),
  User: ({ size = 20 }) => (
    <Icon size={size} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
  ),
  LogOut: ({ size = 20 }) => (
    <Icon size={size} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  ),
  Globe: ({ size = 20 }) => (
    <Icon size={size} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  ),
  EyeOff: ({ size = 20 }) => (
    <Icon size={size} d="M9.88 9.88a3 3 0 104.24 4.24M10.73 5.08A10.43 10.43 0 0112 5c7 0 11 7 11 7a13.16 13.16 0 01-1.67 2.68M6.61 6.61A13.526 13.526 0 001 12s4 7 11 7a9.74 9.74 0 005.39-1.61M2 2l20 20" />
  ),
  Eye: ({ size = 20 }) => (
    <Icon size={size} d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z M12 15a3 3 0 100-6 3 3 0 000 6z" />
  ),
  Check: ({ size = 20 }) => (
    <Icon size={size} d="M20 6L9 17l-5-5" />
  ),
  X: ({ size = 20 }) => (
    <Icon size={size} d="M18 6L6 18M6 6l12 12" />
  ),
  // Hamburger > microphone shape for Dorothy logo mark (karaoke vibe)
  DorothyMark: ({ size = 28 }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#1DB954" />
      <path
        d="M16 9a3 3 0 00-3 3v4a3 3 0 006 0v-4a3 3 0 00-3-3zM21 15v1a5 5 0 01-10 0v-1M16 21v3M13 24h6"
        stroke="#000"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

window.Ico = Icons;
