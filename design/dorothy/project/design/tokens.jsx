// Spotify-inspired design tokens for Dorothy.
// Surface as a Card on the canvas + exported on window for screen mocks to consume.

const TOKENS = {
  // Surfaces — Spotify nests grays from pure black up
  bg:           '#000000', // page
  surface:      '#121212', // primary card / panel
  surfaceHi:    '#1A1A1A', // elevated row / hover
  surfaceHi2:   '#242424', // active row / input field
  divider:      'rgba(255,255,255,0.08)',

  // Brand
  green:        '#1DB954', // classic Spotify
  greenBright:  '#1ED760', // hover / CTA
  greenSoft:    'rgba(29,185,84,0.16)',

  // Text
  text:         '#FFFFFF',
  textMute:     '#B3B3B3',
  textDim:      '#7A7A7A',
  textOnGreen:  '#000000',

  // Accents
  red:          '#F15E6C',
  amber:        '#FFA42B',
};

const FONT = {
  // Spotify uses Circular (proprietary). Closest free families:
  // Manrope — very close letterforms + grotesque rhythm. Geist Sans / Inter as fallback.
  sans: `'Manrope', 'Geist Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`,
};

window.SPOT = TOKENS;
window.SPOT_FONT = FONT;

// — Token card shown on the canvas —
function Swatch({ name, value, dark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 56, height: 56, borderRadius: 8,
          background: value,
          border: dark ? '1px solid rgba(255,255,255,0.08)' : 'none',
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: TOKENS.text, letterSpacing: '-0.01em' }}>{name}</div>
        <div style={{ fontSize: 11, color: TOKENS.textDim, fontFamily: 'ui-monospace, SF Mono, monospace', marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

function TokenCard() {
  return (
    <div
      style={{
        width: 720, height: 900,
        background: TOKENS.bg,
        color: TOKENS.text,
        fontFamily: FONT.sans,
        padding: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: TOKENS.greenBright,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill={TOKENS.textOnGreen}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', color: TOKENS.textMute, textTransform: 'uppercase' }}>
            Dorothy × Spotify Style
          </div>
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
          Design tokens
        </div>
        <div style={{ fontSize: 14, color: TOKENS.textMute, marginTop: 10, maxWidth: 560, lineHeight: 1.5 }}>
          순수 검정 베이스에 회색 계조로 깊이를 만들고, 스포티파이 그린은 재생·강조 한정으로 절제해 사용합니다.
          라이트 모드는 의도적으로 제거하고 다크 전용으로 통일합니다.
        </div>
      </div>

      {/* Surfaces */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: TOKENS.textDim, textTransform: 'uppercase', marginBottom: 12 }}>Surfaces</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Swatch name="--bg / page" value={TOKENS.bg} dark />
          <Swatch name="--surface / card" value={TOKENS.surface} dark />
          <Swatch name="--surface-hi / row" value={TOKENS.surfaceHi} dark />
          <Swatch name="--surface-hi2 / input" value={TOKENS.surfaceHi2} dark />
        </div>
      </div>

      {/* Brand */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: TOKENS.textDim, textTransform: 'uppercase', marginBottom: 12 }}>Brand · play</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Swatch name="--green" value={TOKENS.green} />
          <Swatch name="--green-bright (hover)" value={TOKENS.greenBright} />
        </div>
      </div>

      {/* Text */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: TOKENS.textDim, textTransform: 'uppercase', marginBottom: 12 }}>Text</div>
        <div style={{ background: TOKENS.surface, borderRadius: 8, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: TOKENS.text }}>Now playing — Dorothy</div>
          <div style={{ fontSize: 15, color: TOKENS.textMute }}>B3B3B3 — 보조 텍스트, 아티스트, 메타정보</div>
          <div style={{ fontSize: 13, color: TOKENS.textDim }}>7A7A7A — 비활성 가사, 라벨, 시간</div>
        </div>
      </div>

      {/* Radii / spacing */}
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: TOKENS.textDim, textTransform: 'uppercase', marginBottom: 12 }}>Radius</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            {[4, 8, 12, 9999].map((r, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, background: TOKENS.surfaceHi, borderRadius: r === 9999 ? '50%' : r }} />
                <div style={{ fontSize: 10, color: TOKENS.textDim, marginTop: 6, fontFamily: 'ui-monospace, monospace' }}>{r === 9999 ? 'full' : r + 'px'}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: TOKENS.textDim, textTransform: 'uppercase', marginBottom: 12 }}>Font</div>
          <div style={{ background: TOKENS.surface, borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontFamily: FONT.sans, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Manrope 800</div>
            <div style={{ fontFamily: FONT.sans, fontSize: 14, fontWeight: 500, color: TOKENS.textMute, marginTop: 4 }}>Manrope 500 · 본문</div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, color: TOKENS.textDim, marginTop: 6 }}>SF Mono · 시간 / tabular</div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.TokenCard = TokenCard;
