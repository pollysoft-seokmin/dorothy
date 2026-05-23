// Concept: Spotify-style immersive lyrics view. Tap-to-expand the lyric panel.
const S = window.SPOT;
const F = window.SPOT_FONT;

function ImmersiveLyrics() {
  return (
    <div style={{
      width: 390, height: 844,
      background: 'linear-gradient(180deg, #5B3B7A 0%, #2A1840 40%, #0A0613 100%)',
      color: S.text,
      fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <UI.StatusBar color="#fff" />

      {/* Top bar — collapse */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 20px 16px', flexShrink: 0,
      }}>
        <button style={{
          width: 32, height: 32, border: 'none', background: 'transparent',
          color: S.text, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>가사</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>Bad Moon Rising</div>
        </div>
        <button style={{
          width: 32, height: 32, border: 'none', background: 'transparent',
          color: S.text, cursor: 'pointer',
        }}>
          <Ico.MoreH size={20} />
        </button>
      </div>

      {/* Big lyrics */}
      <div style={{
        flex: 1, padding: '24px 28px 0',
        display: 'flex', flexDirection: 'column', gap: 18,
        overflow: 'hidden',
      }}>
        {[
          { en: 'I see the bad moon a-risin\'',   state: 'past' },
          { en: 'I see trouble on the way',       state: 'past' },
          { en: 'I see earthquakes and lightnin\'', state: 'past' },
          { en: 'I see bad times today',          state: 'active' },
          { en: 'Don\'t go around tonight',       state: 'future' },
          { en: 'Well, it\'s bound to take your life', state: 'future' },
        ].map((l, i) => {
          const isActive = l.state === 'active';
          const isPast = l.state === 'past';
          return (
            <div key={i} style={{
              fontSize: isActive ? 32 : 27,
              fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1,
              color: isActive ? '#fff' : isPast ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.3s',
              transform: `scale(${isActive ? 1 : 0.96})`,
              transformOrigin: 'left',
            }}>
              {l.en}
            </div>
          );
        })}
      </div>

      {/* Mini player at bottom */}
      <div style={{
        flexShrink: 0,
        margin: '0 16px 28px', padding: '12px 14px',
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 4,
          background: 'linear-gradient(135deg, #5B3B7A 0%, #1F1432 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#E6CFFF', fontStyle: 'italic' }}>C</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Bad Moon Rising</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>CCR · 01:23 / 04:56</div>
        </div>
        <UI.PlayCircle playing={true} size={40} />
      </div>

      {/* Home indicator */}
      <div style={{
        width: 134, height: 5, background: '#fff', opacity: 0.6,
        borderRadius: 3, margin: '0 auto 8px',
      }} />
    </div>
  );
}

window.ImmersiveLyrics = ImmersiveLyrics;
