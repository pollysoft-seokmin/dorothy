// Shared UI atoms for Dorothy × Spotify mocks.

const S = window.SPOT;
const F = window.SPOT_FONT;

// — Status bar / device chrome for mobile mocks —
function StatusBar({ color = S.text }) {
  return (
    <div style={{
      height: 44, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 24px', fontFamily: F.sans, fontSize: 15, fontWeight: 600, color,
      flexShrink: 0,
    }}>
      <span>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill={color}>
          <rect x="0" y="7" width="3" height="4" rx="0.5" />
          <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
          <rect x="9" y="3" width="3" height="8" rx="0.5" />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
        </svg>
        {/* Battery */}
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3" stroke={color} opacity="0.6"/>
          <rect x="2" y="2" width="19" height="9" rx="1.5" fill={color}/>
          <rect x="24" y="4" width="2" height="5" rx="1" fill={color} opacity="0.6"/>
        </svg>
      </div>
    </div>
  );
}

// — App header (mobile) — menu + Dorothy mark + user —
function AppHeader({ user = 'me@dorothy.app' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px 12px', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button style={{
          width: 32, height: 32, borderRadius: '50%', border: 'none',
          background: 'rgba(255,255,255,0.06)', color: S.text,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <Ico.Menu size={18} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ico.DorothyMark size={22} />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: S.text }}>Dorothy</span>
        </div>
      </div>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'linear-gradient(135deg, #1DB954 0%, #0E7C39 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: '#000',
      }}>
        {user[0].toUpperCase()}
      </div>
    </div>
  );
}

// — Lyric line in Spotify style —
function Lyric({ text, state = 'past', active = false, checked = false, masked = false, big = false }) {
  // state: 'past' | 'active' | 'future' | 'dim'
  let color = S.textDim;
  let opacity = 1;
  let scale = 1;
  if (state === 'active') { color = S.text; }
  else if (state === 'past') { color = S.textDim; opacity = 0.55; }
  else if (state === 'future') { color = S.textMute; opacity = 0.85; }

  // Mask
  let display = text;
  if (masked) {
    display = text.split('').map((c) => /\s/.test(c) ? c : '–').join('');
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '6px 4px',
    }}>
      {/* checkbox */}
      <div style={{
        width: 16, height: 16, marginTop: 8, flexShrink: 0,
        borderRadius: 3,
        background: checked ? S.greenBright : 'transparent',
        border: checked ? 'none' : `1.5px solid ${S.textDim}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <Ico.Check size={11} stroke="#000" />}
      </div>
      <div style={{
        fontSize: big ? (state === 'active' ? 28 : 24) : (state === 'active' ? 22 : 19),
        fontWeight: state === 'active' ? 800 : 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
        color, opacity,
        transform: `scale(${state === 'active' ? 1 : 0.98})`,
        transformOrigin: 'left',
        transition: 'all 0.3s',
        flex: 1,
        fontFamily: F.sans,
      }}>
        {display}
      </div>
    </div>
  );
}

// — Progress bar Spotify-style —
function Progress({ pct = 0.34, current = '01:23', total = '04:56', dim = false }) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        position: 'relative', height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2,
        overflow: 'visible', cursor: 'pointer',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: `${pct * 100}%`, background: S.text, borderRadius: 2,
        }} />
        {/* Thumb appears on hover/drag — shown in mock */}
        <div style={{
          position: 'absolute', top: '50%', left: `${pct * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: 12, height: 12, borderRadius: '50%', background: S.text,
          opacity: dim ? 0 : 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: 6, fontFamily: 'ui-monospace, monospace',
        fontSize: 11, color: S.textDim, fontWeight: 500,
      }}>
        <span>{current}</span>
        <span>{total}</span>
      </div>
    </div>
  );
}

// — Big green play circle (the Spotify signature) —
function PlayCircle({ playing = false, size = 64 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: S.text, color: '#000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', flexShrink: 0,
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      {playing
        ? <Ico.Pause size={size * 0.42} fill="#000" />
        : <Ico.Play size={size * 0.42} fill="#000" />}
    </div>
  );
}

// — Generic icon button (control row) —
function IconBtn({ children, active = false, disabled = false, dot, size = 40 }) {
  return (
    <button style={{
      width: size, height: size, borderRadius: '50%',
      background: 'transparent', border: 'none',
      color: disabled ? S.textDim : active ? S.greenBright : S.textMute,
      opacity: disabled ? 0.4 : 1,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: disabled ? 'default' : 'pointer',
      position: 'relative',
    }}>
      {children}
      {active && (
        <span style={{
          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
          width: 4, height: 4, borderRadius: '50%', background: S.greenBright,
        }} />
      )}
      {dot && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          minWidth: 14, height: 14, borderRadius: 7,
          background: S.greenBright, color: '#000',
          fontSize: 9, fontWeight: 800, padding: '0 4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: F.sans,
        }}>{dot}</span>
      )}
    </button>
  );
}

window.UI = { StatusBar, AppHeader, Lyric, Progress, PlayCircle, IconBtn };
