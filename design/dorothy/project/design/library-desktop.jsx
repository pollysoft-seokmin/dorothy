// Desktop Library — adopts the mobile Bottom Sheet's design vocabulary
// (StorageGauge, type tiles, breadcrumb chips, section labels, bottom action bar).
// Lives as a right-edge sidebar (340 wide) in the desktop layout.
const S = window.SPOT;
const F = window.SPOT_FONT;

// Reuse all the row primitives from library-sheet.jsx through window. We re-declare
// thinner desktop versions here (same vocab, slightly tighter type sizes).

function DTypeTile({ kind, active }) {
  const accent =
    kind === 'folder' ? S.text :
    kind === 'video'  ? '#A28DFF' :
    kind === 'lyrics' ? '#FFB75D' :
                        S.greenBright;
  const Icon =
    kind === 'folder' ? Ico.Folder :
    kind === 'video'  ? Ico.Film :
    kind === 'lyrics' ? Ico.FileText :
                        Ico.Music;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 6, flexShrink: 0,
      background: S.surfaceHi,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: active ? S.greenBright : accent,
    }}>
      {active ? (
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
          <div style={{ width: 2.5, height: 8,  background: S.greenBright, borderRadius: 1 }} />
          <div style={{ width: 2.5, height: 14, background: S.greenBright, borderRadius: 1 }} />
          <div style={{ width: 2.5, height: 6,  background: S.greenBright, borderRadius: 1 }} />
          <div style={{ width: 2.5, height: 11, background: S.greenBright, borderRadius: 1 }} />
        </div>
      ) : (
        <Icon size={17} />
      )}
    </div>
  );
}

function DFolderRow({ name, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 8px', borderRadius: 6,
      cursor: 'pointer',
    }}>
      <DTypeTile kind="folder" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: S.text, letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{ fontSize: 11, color: S.textDim, marginTop: 2 }}>{count}개 항목</div>
      </div>
      <span style={{ color: S.textDim }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </span>
    </div>
  );
}

function DAssetRow({ name, kind, size, active }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 8px', borderRadius: 6,
      cursor: 'pointer',
      background: active ? 'rgba(29,215,96,0.10)' : 'transparent',
    }}>
      <DTypeTile kind={kind} active={active} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: active ? S.greenBright : S.text,
          letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{
          fontSize: 11, color: S.textDim, marginTop: 2,
          display: 'flex', gap: 5, alignItems: 'center',
        }}>
          <span>{kind === 'video' ? '영상' : kind === 'lyrics' ? '가사' : '오디오'}</span>
          <span>·</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{size}</span>
        </div>
      </div>
      <button style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: S.textDim,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Ico.MoreH size={14} />
      </button>
    </div>
  );
}

function DPendingRow({ name, kind, phase, progress }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 8px', borderRadius: 6,
    }}>
      <DTypeTile kind={kind} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: S.textMute, letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</div>
        <div style={{
          fontSize: 11, color: S.greenBright, marginTop: 3, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{phase}</span>
          <span style={{ fontFamily: 'ui-monospace, monospace' }}>{progress}%</span>
        </div>
        <div style={{ marginTop: 5, height: 2.5, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: S.greenBright }} />
        </div>
      </div>
    </div>
  );
}

function DSectionLabel({ children, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 8px 4px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: S.textDim,
        letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>{children}</div>
      {right && <div style={{ fontSize: 11, color: S.textDim }}>{right}</div>}
    </div>
  );
}

function DBreadcrumb({ path }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 0', flexWrap: 'wrap',
    }}>
      {path.map((crumb, i) => {
        const active = i === path.length - 1;
        return (
          <React.Fragment key={i}>
            <button style={{
              padding: '5px 11px', borderRadius: 999,
              background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
              border: 'none',
              color: active ? S.text : S.textMute,
              fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              {i === 0 && <Ico.Home size={12} />}
              {crumb}
            </button>
            {i < path.length - 1 && <span style={{ color: S.textDim, fontSize: 12 }}>/</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Desktop sidebar — replaces the old aside in DesktopLayout
function DesktopLibrarySidebar() {
  return (
    <div style={{
      width: 340,
      background: S.surface,
      borderLeft: `1px solid ${S.divider}`,
      display: 'flex', flexDirection: 'column',
      flexShrink: 0,
      color: S.text, fontFamily: F.sans,
    }}>
      {/* Header */}
      <div style={{ padding: '18px 18px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Ico.Library size={17} stroke={S.text} />
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>내 미디어</div>
        </div>
        <button style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'transparent', border: 'none',
          color: S.textMute, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico.Search size={15} />
        </button>
      </div>

      {/* Storage gauge — same component as mobile */}
      <div style={{ padding: '14px 18px 12px' }}>
        <StorageGauge />
      </div>

      {/* Breadcrumb */}
      <div style={{ padding: '0 14px 6px', borderBottom: `1px solid ${S.divider}` }}>
        <DBreadcrumb path={['홈', 'CCR']} />
      </div>

      {/* Scrollable list */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto',
        padding: '0 10px 8px',
      }}>
        <DSectionLabel right="2 / 5 완료">업로드 중</DSectionLabel>
        <DPendingRow name="Down on the Corner.mp3" kind="audio" phase="업로드" progress={64} />
        <DPendingRow name="Susie Q live 1970.mp4" kind="video" phase="변환" progress={28} />

        <DSectionLabel>폴더</DSectionLabel>
        <DFolderRow name="80s rock" count={12} />
        <DFolderRow name="K-pop study" count={34} />

        <DSectionLabel right="6">파일</DSectionLabel>
        <DAssetRow name="Bad Moon Rising.mp3" kind="audio" size="5.2 MB" active />
        <DAssetRow name="Bad Moon Rising.lrc" kind="lyrics" size="3.1 KB" />
        <DAssetRow name="Have You Ever Seen the Rain.mp3" kind="audio" size="4.8 MB" />
        <DAssetRow name="Have You Ever Seen.lrc" kind="lyrics" size="2.8 KB" />
        <DAssetRow name="Fortunate Son.mp3" kind="audio" size="4.1 MB" />
        <DAssetRow name="Proud Mary.mp3" kind="audio" size="6.0 MB" />
      </div>

      {/* Sticky bottom action bar — identical to mobile */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10,
        padding: '12px 18px 16px',
        borderTop: `1px solid ${S.divider}`,
        background: S.surface,
      }}>
        <button style={{
          height: 40, borderRadius: 999,
          background: 'transparent', border: `1px solid rgba(255,255,255,0.22)`,
          color: S.text, fontSize: 13, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Ico.Plus size={14} /> 폴더
        </button>
        <button style={{
          height: 40, borderRadius: 999,
          background: S.greenBright, border: 'none', color: '#000',
          fontSize: 13, fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: '0 4px 12px rgba(29,215,96,0.3)',
        }}>
          <Ico.Upload size={14} /> 업로드
        </button>
      </div>
    </div>
  );
}

// — New full desktop layout using the redesigned sidebar —
function DesktopLayoutV2() {
  return (
    <div style={{
      width: 1280, height: 800,
      background: S.bg,
      color: S.text,
      fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top nav */}
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

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Center: player (reusing existing pattern) */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          padding: '40px 56px 24px',
          maxWidth: 760, margin: '0 auto', width: '100%',
        }}>
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
              <div style={{ fontSize: 11, fontWeight: 700, color: S.greenBright, letterSpacing: '0.2em', textTransform: 'uppercase' }}>재생 중</div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 6 }}>Bad Moon Rising</div>
              <div style={{ fontSize: 14, color: S.textMute, marginTop: 4 }}>Creedence Clearwater Revival</div>
            </div>
          </div>

          <div style={{
            flex: 1, minHeight: 0, overflow: 'hidden', marginTop: 24,
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 10%, #000 90%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 10%, #000 90%, transparent 100%)',
          }}>
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { en: 'I see the bad moon a-risin\'',          ko: '저기 불길한 달이 떠오르네',   state: 'past' },
                { en: 'I see trouble on the way',              ko: '문제가 다가오는 게 보여',     state: 'past', checked: true },
                { en: 'I see earthquakes and lightnin\'',      ko: '지진과 번개가 보이네',        state: 'past', checked: true },
                { en: 'I see bad times today',                 ko: '오늘은 안 좋은 날이야',       state: 'active', checked: true },
                { en: 'Don\'t go around tonight',              ko: '오늘 밤엔 돌아다니지 마',     state: 'future' },
                { en: 'There\'s a bad moon on the rise',       ko: '불길한 달이 떠오르고 있어',   state: 'future' },
              ].map((l, i) => {
                const isActive = l.state === 'active';
                const isPast = l.state === 'past';
                const baseColor = isActive ? S.text : isPast ? S.textDim : S.textMute;
                const baseOpacity = isActive ? 1 : isPast ? 0.5 : 0.85;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '6px 0' }}>
                    <div style={{
                      width: 18, height: 18, marginTop: isActive ? 12 : 8, flexShrink: 0,
                      borderRadius: 3,
                      background: l.checked ? S.greenBright : 'transparent',
                      border: l.checked ? 'none' : `1.5px solid ${S.textDim}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{l.checked && <Ico.Check size={12} stroke="#000" />}</div>
                    <div style={{ flex: 1, opacity: baseOpacity }}>
                      <div style={{
                        fontSize: isActive ? 30 : 22, fontWeight: isActive ? 800 : 700,
                        letterSpacing: '-0.02em', lineHeight: 1.2, color: baseColor,
                      }}>{l.en}</div>
                      <div style={{
                        fontSize: isActive ? 18 : 14, fontWeight: 600,
                        letterSpacing: '-0.01em', lineHeight: 1.3, marginTop: 4,
                        color: isActive ? S.textMute : S.textDim,
                      }}>{l.ko}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ flexShrink: 0, marginTop: 16 }}>
            <UI.Progress pct={0.34} current="01:23" total="04:56" />
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center', marginTop: 14,
            }}>
              <div style={{ display: 'flex' }}>
                <UI.IconBtn active dot="3"><Ico.Repeat size={20} /></UI.IconBtn>
              </div>
              <UI.PlayCircle playing={true} size={72} />
              <div style={{ display: 'flex', justifySelf: 'end' }}>
                <UI.IconBtn><Ico.EyeOff size={20} /></UI.IconBtn>
                <UI.IconBtn><Ico.Globe size={20} /></UI.IconBtn>
              </div>
            </div>
          </div>
        </div>

        <DesktopLibrarySidebar />
      </div>
    </div>
  );
}

window.DesktopLayoutV2 = DesktopLayoutV2;
window.DesktopLibrarySidebar = DesktopLibrarySidebar;
