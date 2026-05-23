// Desktop layout: player center + Media Library aside. Matches src/routes/index.tsx.
const S = window.SPOT;
const F = window.SPOT_FONT;

function FolderRow({ name, dim }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 12px', borderRadius: 6,
      background: dim ? 'transparent' : 'rgba(255,255,255,0.04)',
      color: dim ? S.textMute : S.text,
      cursor: 'pointer',
    }}>
      <Ico.Folder size={18} />
      <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{name}</span>
      <Ico.MoreH size={14} />
    </div>
  );
}

function AssetRow({ name, kind = 'audio', size, active, playing }) {
  const Icon = kind === 'video' ? Ico.Film : kind === 'lyrics' ? Ico.FileText : Ico.Music;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 12px', borderRadius: 6,
      background: active ? 'rgba(29,215,96,0.12)' : 'transparent',
      color: active ? S.greenBright : S.text,
      cursor: 'pointer',
      position: 'relative',
    }}>
      {playing ? (
        <div style={{ width: 18, display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
          <div style={{ width: 3, height: 8, background: S.greenBright, borderRadius: 1 }} />
          <div style={{ width: 3, height: 14, background: S.greenBright, borderRadius: 1 }} />
          <div style={{ width: 3, height: 6, background: S.greenBright, borderRadius: 1 }} />
          <div style={{ width: 3, height: 11, background: S.greenBright, borderRadius: 1 }} />
        </div>
      ) : (
        <Icon size={16} stroke={active ? S.greenBright : S.textMute} />
      )}
      <span style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <span style={{ fontSize: 11, color: S.textDim, fontFamily: 'ui-monospace, monospace' }}>{size}</span>
    </div>
  );
}

function MediaLibrarySidebar() {
  return (
    <div style={{
      width: 340,
      background: S.surface,
      borderLeft: `1px solid ${S.divider}`,
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 14px', borderBottom: `1px solid ${S.divider}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ico.Library size={16} stroke={S.text} />
            <div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>내 미디어</div>
          </div>
          <div style={{ fontSize: 11, color: S.textMute, fontFamily: 'ui-monospace, monospace' }}>
            312 MB / 2.0 GB
          </div>
        </div>
        <div style={{ height: 3, background: S.surfaceHi2, borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
          <div style={{ width: '15%', height: '100%', background: S.greenBright, borderRadius: 2 }} />
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.divider}`, fontSize: 12, color: S.textMute }}>
        <span style={{ color: S.text, fontWeight: 700 }}>홈</span>
        <span style={{ margin: '0 6px', color: S.textDim }}>/</span>
        <span style={{ color: S.text, fontWeight: 700 }}>CCR</span>
      </div>

      {/* Toolbar */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${S.divider}`, display: 'flex', gap: 8 }}>
        <button style={{
          height: 30, padding: '0 12px', borderRadius: 999,
          background: 'transparent', border: `1px solid rgba(255,255,255,0.2)`,
          color: S.text, fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <Ico.Plus size={14} /> 폴더
        </button>
        <button style={{
          height: 30, padding: '0 14px', borderRadius: 999,
          background: S.greenBright, border: 'none',
          color: '#000', fontSize: 12, fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <Ico.Upload size={14} /> 업로드
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FolderRow name="80s rock" />
        <FolderRow name="K-pop study" />
        <FolderRow name="Movies" dim />
        <div style={{ height: 8 }} />
        <AssetRow name="Bad Moon Rising.mp3" kind="audio" size="5.2 MB" active playing />
        <AssetRow name="Bad Moon Rising.lrc" kind="lyrics" size="3.1 KB" />
        <AssetRow name="Have You Ever Seen the Rain.mp3" kind="audio" size="4.8 MB" />
        <AssetRow name="Have You Ever Seen.lrc" kind="lyrics" size="2.8 KB" />
        <AssetRow name="Fortunate Son.mp3" kind="audio" size="4.1 MB" />
        <AssetRow name="Susie Q live 1970.mp4" kind="video" size="48.3 MB" />
        <AssetRow name="Proud Mary.mp3" kind="audio" size="6.0 MB" />

        {/* uploading row */}
        <div style={{
          padding: '8px 12px', borderRadius: 6, position: 'relative', overflow: 'hidden',
          color: S.textDim, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Ico.Music size={16} />
          <span style={{ fontSize: 13, flex: 1 }}>Down on the Corner.mp3</span>
          <span style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>업로드 중 · 64%</span>
          <div style={{
            position: 'absolute', left: 0, bottom: 0, height: 2,
            width: '64%', background: S.greenBright, opacity: 0.85,
          }} />
        </div>
      </div>
    </div>
  );
}

function DesktopLayout() {
  return (
    <div style={{
      width: 1280, height: 800,
      background: S.bg,
      color: S.text,
      fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top auth header */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', borderBottom: `1px solid ${S.divider}`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Ico.DorothyMark size={26} />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Dorothy</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: S.textMute }}>me@dorothy.app</span>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1DB954 0%, #0E7C39 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#000',
          }}>M</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Center player */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '40px 56px 24px',
          maxWidth: 760, margin: '0 auto',
          width: '100%',
        }}>
          {/* Track header */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 88, height: 88, borderRadius: 8,
              background: 'linear-gradient(135deg, #5B3B7A 0%, #1F1432 100%)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 42, fontWeight: 700, color: '#E6CFFF', fontStyle: 'italic' }}>C</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.greenBright, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                재생 중
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6, color: S.text }}>
                Bad Moon Rising
              </div>
              <div style={{ fontSize: 14, color: S.textMute, marginTop: 4 }}>
                Creedence Clearwater Revival
              </div>
            </div>
            <button style={{
              background: 'transparent', border: 'none', color: S.textMute, cursor: 'pointer',
              padding: 8,
            }}>
              <Ico.Heart size={22} />
            </button>
          </div>

          {/* Lyrics — desktop, single language English shown */}
          <div style={{
            flex: 1, minHeight: 0, overflow: 'hidden', marginTop: 24,
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 10%, #000 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 10%, #000 90%, transparent 100%)',
          }}>
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { en: 'I see the bad moon a-risin\'',          ko: '저기 불길한 달이 떠오르네',         state: 'past' },
                { en: 'I see trouble on the way',              ko: '문제가 다가오는 게 보여',          state: 'past', checked: true },
                { en: 'I see earthquakes and lightnin\'',      ko: '지진과 번개가 보이네',            state: 'past', checked: true },
                { en: 'I see bad times today',                 ko: '오늘은 안 좋은 날이야',           state: 'active', checked: true },
                { en: 'Don\'t go around tonight',              ko: '오늘 밤엔 돌아다니지 마',         state: 'future' },
                { en: 'Well, it\'s bound to take your life',   ko: '네 목숨을 앗아갈지 몰라',         state: 'future' },
                { en: 'There\'s a bad moon on the rise',       ko: '불길한 달이 떠오르고 있어',       state: 'future' },
              ].map((l, i) => (
                <DesktopLyric key={i} line={l} />
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ flexShrink: 0, marginTop: 16 }}>
            <UI.Progress pct={0.34} current="01:23" total="04:56" />
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center', marginTop: 14,
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <UI.IconBtn active dot="3">
                  <Ico.Repeat size={20} />
                </UI.IconBtn>
              </div>
              <UI.PlayCircle playing={true} size={72} />
              <div style={{ display: 'flex', gap: 0, justifySelf: 'end' }}>
                <UI.IconBtn>
                  <Ico.EyeOff size={20} />
                </UI.IconBtn>
                <UI.IconBtn>
                  <Ico.Globe size={20} />
                </UI.IconBtn>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <MediaLibrarySidebar />
      </div>
    </div>
  );
}

function DesktopLyric({ line }) {
  const isActive = line.state === 'active';
  const isPast = line.state === 'past';
  const baseColor = isActive ? S.text : isPast ? S.textDim : S.textMute;
  const baseOpacity = isActive ? 1 : isPast ? 0.5 : 0.85;
  const subColor = isActive ? S.textMute : S.textDim;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '6px 0' }}>
      <div style={{
        width: 18, height: 18, marginTop: isActive ? 12 : 8, flexShrink: 0,
        borderRadius: 3,
        background: line.checked ? S.greenBright : 'transparent',
        border: line.checked ? 'none' : `1.5px solid ${S.textDim}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {line.checked && <Ico.Check size={12} stroke="#000" />}
      </div>
      <div style={{ flex: 1, opacity: baseOpacity, transition: 'all 0.3s' }}>
        <div style={{
          fontSize: isActive ? 30 : 22, fontWeight: isActive ? 800 : 700,
          letterSpacing: '-0.02em', lineHeight: 1.2, color: baseColor,
        }}>{line.en}</div>
        <div style={{
          fontSize: isActive ? 18 : 14, fontWeight: 600,
          letterSpacing: '-0.01em', lineHeight: 1.3, marginTop: 4,
          color: subColor,
        }}>{line.ko}</div>
      </div>
    </div>
  );
}

window.DesktopLayout = DesktopLayout;
