// Now Playing — Audio. The hero screen.
const S = window.SPOT;
const F = window.SPOT_FONT;

// Sample SAMI bilingual lyrics — looks like the real data structure
const LYRICS = [
  { en: 'I see the bad moon a-risin\'',          ko: '저기 불길한 달이 떠오르네',         state: 'past' },
  { en: 'I see trouble on the way',              ko: '문제가 다가오는 게 보여',          state: 'past', checked: true },
  { en: 'I see earthquakes and lightnin\'',      ko: '지진과 번개가 보이네',            state: 'past', checked: true },
  { en: 'I see bad times today',                 ko: '오늘은 안 좋은 날이야',           state: 'active', checked: true },
  { en: 'Don\'t go around tonight',              ko: '오늘 밤엔 돌아다니지 마',         state: 'future' },
  { en: 'Well, it\'s bound to take your life',   ko: '네 목숨을 앗아갈지 몰라',         state: 'future' },
  { en: 'There\'s a bad moon on the rise',       ko: '불길한 달이 떠오르고 있어',       state: 'future' },
  { en: 'I hear hurricanes a-blowin\'',          ko: '허리케인이 부는 소리가 들려',     state: 'future' },
];

function NowPlayingAudio({ language = 'en-ko' }) {
  return (
    <div style={{
      width: 390, height: 844,
      background: S.bg,
      color: S.text,
      fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Subtle vibrant gradient bleed from album-art derived hue */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 60% at 50% 0%, rgba(74, 35, 95, 0.55) 0%, rgba(0,0,0,0) 55%)',
      }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <UI.StatusBar />
        <UI.AppHeader />

        {/* Track header — album art + title + artist */}
        <div style={{ padding: '4px 20px 18px', display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 6,
            background: 'linear-gradient(135deg, #5B3B7A 0%, #1F1432 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700,
              color: '#E6CFFF', fontStyle: 'italic',
            }}>C</div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: S.text }}>
              Bad Moon Rising
            </div>
            <div style={{ fontSize: 13, color: S.textMute, marginTop: 2 }}>
              Creedence Clearwater Revival
            </div>
          </div>
          <button style={{
            background: 'transparent', border: 'none', color: S.textMute, cursor: 'pointer',
            padding: 8, marginRight: -8,
          }}>
            <Ico.Heart size={20} />
          </button>
        </div>

        {/* Lyrics panel — the meat */}
        <div style={{
          flex: 1, minHeight: 0, overflow: 'hidden',
          padding: '0 20px',
          maskImage: 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 12%, #000 88%, transparent 100%)',
        }}>
          <div style={{ paddingTop: 24 }}>
            {LYRICS.map((l, i) => {
              const text =
                language === 'en' ? l.en :
                language === 'ko' ? l.ko :
                `${l.en}\n${l.ko}`;
              return (
                <Lyric_Stacked
                  key={i}
                  line={l}
                  language={language}
                />
              );
            })}
          </div>
        </div>

        {/* Bottom controls bar */}
        <div style={{
          padding: '12px 20px 28px',
          flexShrink: 0,
        }}>
          <UI.Progress pct={0.34} current="01:23" total="04:56" />

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center', marginTop: 14,
          }}>
            {/* Left: repeat */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <UI.IconBtn active dot="3">
                <Ico.Repeat size={18} />
              </UI.IconBtn>
            </div>
            {/* Center: Play */}
            <UI.PlayCircle playing={true} size={68} />
            {/* Right: expose + language */}
            <div style={{ display: 'flex', gap: 0, justifySelf: 'end' }}>
              <UI.IconBtn>
                <Ico.EyeOff size={18} />
              </UI.IconBtn>
              <UI.IconBtn>
                <Ico.Globe size={18} />
              </UI.IconBtn>
            </div>
          </div>

          {/* Home indicator */}
          <div style={{
            width: 134, height: 5, background: S.text, opacity: 0.6,
            borderRadius: 3, margin: '14px auto 0',
          }} />
        </div>
      </div>
    </div>
  );
}

// Compact stacked bilingual lyric (en on top, ko underneath)
function Lyric_Stacked({ line, language }) {
  const isActive = line.state === 'active';
  const isPast = line.state === 'past';

  const baseColor = isActive ? S.text : isPast ? S.textDim : S.textMute;
  const baseOpacity = isActive ? 1 : isPast ? 0.5 : 0.85;
  const subColor = isActive ? S.textMute : S.textDim;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '8px 0',
    }}>
      <div style={{
        width: 16, height: 16, marginTop: isActive ? 10 : 6, flexShrink: 0,
        borderRadius: 3,
        background: line.checked ? S.greenBright : 'transparent',
        border: line.checked ? 'none' : `1.5px solid ${S.textDim}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {line.checked && <Ico.Check size={11} stroke="#000" />}
      </div>
      <div style={{ flex: 1, minWidth: 0, opacity: baseOpacity, transition: 'all 0.3s' }}>
        {(language === 'en' || language === 'en-ko') && (
          <div style={{
            fontSize: isActive ? 24 : 19,
            fontWeight: isActive ? 800 : 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: baseColor,
          }}>{line.en}</div>
        )}
        {(language === 'ko' || language === 'en-ko') && (
          <div style={{
            fontSize: isActive ? 17 : 14,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1.3,
            marginTop: language === 'en-ko' ? 2 : 0,
            color: language === 'en-ko' ? subColor : baseColor,
          }}>{line.ko}</div>
        )}
      </div>
    </div>
  );
}

window.NowPlayingAudio = NowPlayingAudio;
