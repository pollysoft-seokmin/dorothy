// Mobile top-nav background variants for AuthHeader on the home (player) screen.
// Goal: separate the nav strip from the main content area.
const S = window.SPOT;
const F = window.SPOT_FONT;

function PhoneFrame({ children, label, note }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        width: 390, height: 844,
        background: S.bg, color: S.text, fontFamily: F.sans,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        position: 'relative',
      }}>
        {children}
      </div>
      <div style={{
        padding: '8px 12px', background: S.surface, borderRadius: 8,
        fontFamily: F.sans, color: S.textMute, fontSize: 11, lineHeight: 1.5,
      }}>
        <span style={{ color: S.greenBright, fontWeight: 800 }}>{label} · </span>{note}
      </div>
    </div>
  );
}

// — Variant header bars —
// Each NavBar renders status bar + nav row, leaving the rest of the layout up to caller.
function NavBar({ kind = 'solid' }) {
  // kind: 'solid' | 'frost' | 'gradient'
  const styles = {
    solid: {
      background: S.surface,                  // #121212 panel
      borderBottom: `1px solid ${S.divider}`,
    },
    frost: {
      background: 'rgba(20,20,20,0.65)',
      backdropFilter: 'blur(18px) saturate(140%)',
      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
      borderBottom: `1px solid rgba(255,255,255,0.06)`,
    },
    gradient: {
      // Subtle bleed from album-art derived hue, soft shadow underneath
      background: 'linear-gradient(180deg, rgba(91,59,122,0.55) 0%, rgba(20,20,20,0.92) 100%)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 6px 14px -10px rgba(0,0,0,0.8)',
    },
  };

  return (
    <div style={{
      ...styles[kind],
      flexShrink: 0,
      transition: 'background 0.3s',
    }}>
      {/* Status bar */}
      <div style={{
        height: 44, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 24px', fontFamily: F.sans, fontSize: 15, fontWeight: 600, color: S.text,
      }}>
        <span>9:41</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <svg width="17" height="11" viewBox="0 0 17 11" fill={S.text}>
            <rect x="0" y="7" width="3" height="4" rx="0.5" />
            <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
            <rect x="9" y="3" width="3" height="8" rx="0.5" />
            <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
          </svg>
          <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
            <rect x="0.5" y="0.5" width="22" height="12" rx="3" stroke={S.text} opacity="0.6"/>
            <rect x="2" y="2" width="19" height="9" rx="1.5" fill={S.text}/>
            <rect x="24" y="4" width="2" height="5" rx="1" fill={S.text} opacity="0.6"/>
          </svg>
        </div>
      </div>

      {/* Nav row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.08)', color: S.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Ico.Menu size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ico.DorothyMark size={22} />
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: S.text }}>Dorothy</span>
          </div>
        </div>
        <button style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #1DB954 0%, #0E7C39 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#000', border: 'none', cursor: 'pointer',
        }}>M</button>
      </div>
    </div>
  );
}

// Reusable body that goes UNDER the nav — same content for all three variants
function PlayerBody({ topGradient = null }) {
  return (
    <div style={{
      position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
      minHeight: 0,
    }}>
      {topGradient && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: topGradient,
        }} />
      )}

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Track header */}
        <div style={{ padding: '16px 20px 14px', display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 6, flexShrink: 0,
            background: 'linear-gradient(135deg, #5B3B7A 0%, #1F1432 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: '#E6CFFF', fontStyle: 'italic' }}>C</div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>Bad Moon Rising</div>
            <div style={{ fontSize: 12, color: S.textMute, marginTop: 2 }}>Creedence Clearwater Revival</div>
          </div>
        </div>

        {/* Lyrics */}
        <div style={{
          flex: 1, minHeight: 0, padding: '8px 20px 0',
          maskImage: 'linear-gradient(to bottom, transparent 0%, #000 10%, #000 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 10%, #000 90%, transparent 100%)',
          overflow: 'hidden',
        }}>
          {[
            { en: 'I see trouble on the way', ko: '문제가 다가오는 게 보여', state: 'past', checked: true },
            { en: 'I see earthquakes and lightnin\'', ko: '지진과 번개가 보이네', state: 'past', checked: true },
            { en: 'I see bad times today', ko: '오늘은 안 좋은 날이야', state: 'active', checked: true },
            { en: 'Don\'t go around tonight', ko: '오늘 밤엔 돌아다니지 마', state: 'future' },
            { en: 'Well, it\'s bound to take your life', ko: '네 목숨을 앗아갈지 몰라', state: 'future' },
          ].map((l, i) => {
            const isActive = l.state === 'active';
            const isPast = l.state === 'past';
            const baseColor = isActive ? S.text : isPast ? S.textDim : S.textMute;
            const baseOpacity = isActive ? 1 : isPast ? 0.5 : 0.85;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '6px 0' }}>
                <div style={{
                  width: 16, height: 16, marginTop: isActive ? 9 : 5, flexShrink: 0,
                  borderRadius: 3,
                  background: l.checked ? S.greenBright : 'transparent',
                  border: l.checked ? 'none' : `1.5px solid ${S.textDim}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {l.checked && <Ico.Check size={11} stroke="#000" />}
                </div>
                <div style={{ flex: 1, opacity: baseOpacity }}>
                  <div style={{
                    fontSize: isActive ? 22 : 18, fontWeight: isActive ? 800 : 700,
                    letterSpacing: '-0.02em', lineHeight: 1.2, color: baseColor,
                  }}>{l.en}</div>
                  <div style={{
                    fontSize: isActive ? 14 : 12, fontWeight: 600,
                    letterSpacing: '-0.01em', lineHeight: 1.3, marginTop: 2,
                    color: isActive ? S.textMute : S.textDim,
                  }}>{l.ko}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom controls */}
        <div style={{ padding: '8px 20px 24px', flexShrink: 0 }}>
          <UI.Progress pct={0.34} current="01:23" total="04:56" />
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center', marginTop: 10,
          }}>
            <div style={{ display: 'flex' }}>
              <UI.IconBtn active dot="3"><Ico.Repeat size={18} /></UI.IconBtn>
            </div>
            <UI.PlayCircle playing={true} size={64} />
            <div style={{ display: 'flex', justifySelf: 'end' }}>
              <UI.IconBtn><Ico.EyeOff size={18} /></UI.IconBtn>
              <UI.IconBtn><Ico.Globe size={18} /></UI.IconBtn>
            </div>
          </div>
          <div style={{ width: 134, height: 5, background: S.text, opacity: 0.6, borderRadius: 3, margin: '12px auto 0' }} />
        </div>
      </div>
    </div>
  );
}

// — Variant A: Solid panel — most explicit separation, lowest cost
function NavVariantSolid() {
  return (
    <PhoneFrame
      label="A · Solid panel"
      note="배경 #121212 + 1px divider. 가장 명확한 분리, 구현 비용 최소. AuthHeader에 bg-surface + border-b만 추가."
    >
      <NavBar kind="solid" />
      <PlayerBody />
    </PhoneFrame>
  );
}

// — Variant B: Frosted glass — modern, scroll에서 lyrics가 바 뒤로 깔리는 느낌
function NavVariantFrost() {
  return (
    <PhoneFrame
      label="B · Frosted glass"
      note="rgba(20,20,20,0.65) + backdrop-blur. 가사가 스크롤되며 살짝 비쳐 깊이감 ↑. iOS Safari 15+ 호환, Android Chrome 76+ OK."
    >
      <NavBar kind="frost" />
      <PlayerBody />
    </PhoneFrame>
  );
}

// — Variant C: Gradient bleed — album-art 색을 헤더가 흡수
function NavVariantGradient() {
  return (
    <PhoneFrame
      label="C · Album-art gradient"
      note="앨범아트의 dominant color를 헤더 → bg로 페이드. 가장 무드 있음. id3-reader에서 색 추출 1줄만 추가하면 됨."
    >
      <NavBar kind="gradient" />
      <PlayerBody topGradient="radial-gradient(120% 50% at 50% 0%, rgba(91,59,122,0.18) 0%, rgba(0,0,0,0) 60%)" />
    </PhoneFrame>
  );
}

window.NavVariantSolid = NavVariantSolid;
window.NavVariantFrost = NavVariantFrost;
window.NavVariantGradient = NavVariantGradient;
