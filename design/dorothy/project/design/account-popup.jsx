// Mobile account popup — replaces full /account route on mobile.
// Bottom-sheet modal triggered by tapping the avatar in the top nav.
const S = window.SPOT;
const F = window.SPOT_FONT;

const HISTORY = [
  { title: 'Bad Moon Rising',          artist: 'Creedence Clearwater Revival', when: '방금 전',     kind: 'audio', playing: true },
  { title: 'Have You Ever Seen the Rain', artist: 'Creedence Clearwater Revival', when: '15분 전',  kind: 'audio' },
  { title: 'Susie Q live 1970',        artist: 'CCR',                          when: '1시간 전',   kind: 'video' },
  { title: 'Fortunate Son',            artist: 'Creedence Clearwater Revival', when: '어제',       kind: 'audio' },
  { title: 'Proud Mary',               artist: 'Creedence Clearwater Revival', when: '어제',       kind: 'audio' },
  { title: 'Down on the Corner',       artist: 'Creedence Clearwater Revival', when: '2일 전',     kind: 'audio' },
];

function HistoryRow({ row }) {
  const Icon = row.kind === 'video' ? Ico.Film : Ico.Music;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 4px',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 4, flexShrink: 0,
        background: S.surfaceHi,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: row.playing ? S.greenBright : S.textMute,
        position: 'relative',
      }}>
        {row.playing ? (
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
            <div style={{ width: 3, height: 9, background: S.greenBright, borderRadius: 1 }} />
            <div style={{ width: 3, height: 16, background: S.greenBright, borderRadius: 1 }} />
            <div style={{ width: 3, height: 7, background: S.greenBright, borderRadius: 1 }} />
            <div style={{ width: 3, height: 12, background: S.greenBright, borderRadius: 1 }} />
          </div>
        ) : (
          <Icon size={18} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: row.playing ? S.greenBright : S.text,
          letterSpacing: '-0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{row.title}</div>
        <div style={{
          fontSize: 12, color: S.textMute, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {row.artist} · <span style={{ color: S.textDim }}>{row.when}</span>
        </div>
      </div>
    </div>
  );
}

// — Backdrop player (dimmed behind the sheet) —
function BackdropPlayer() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: S.bg, color: S.text, fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      filter: 'brightness(0.4)',
    }}>
      <div style={{ height: 44 }} />
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ico.DorothyMark size={22} />
            <span style={{ fontSize: 18, fontWeight: 800 }}>Dorothy</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1 }} />
    </div>
  );
}

// — Variant A: Bottom sheet —
function AccountSheet() {
  return (
    <div style={{
      width: 390, height: 844,
      fontFamily: F.sans, position: 'relative', overflow: 'hidden',
      background: '#000',
    }}>
      <BackdropPlayer />
      {/* Dim overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
      }} />

      {/* Bottom sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: S.surface,
        borderTopLeftRadius: 18, borderTopRightRadius: 18,
        boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        maxHeight: 720,
        color: S.text,
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)' }} />
        </div>

        {/* Header row — title + close */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 8px',
        }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>내 계정</div>
          <button style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            color: S.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico.X size={18} />
          </button>
        </div>

        {/* Profile card */}
        <div style={{ padding: '8px 20px 16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px',
            background: S.surfaceHi, borderRadius: 12,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1DB954 0%, #0E7C39 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: '#000',
              flexShrink: 0,
            }}>M</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.textMute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                이메일
              </div>
              <div style={{
                fontSize: 15, fontWeight: 700, color: S.text, marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>me@dorothy.app</div>
            </div>
            <button style={{
              padding: '8px 14px', borderRadius: 999,
              background: 'transparent', border: `1px solid rgba(255,255,255,0.22)`,
              color: S.text, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
              <Ico.LogOut size={14} />
              로그아웃
            </button>
          </div>

          {/* Storage usage mini */}
          <div style={{
            marginTop: 12, padding: '12px 16px',
            background: S.surfaceHi, borderRadius: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: S.textMute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                스토리지
              </div>
              <div style={{ fontSize: 12, color: S.text, fontFamily: 'ui-monospace, monospace' }}>
                312 MB <span style={{ color: S.textDim }}> / 2.0 GB</span>
              </div>
            </div>
            <div style={{ height: 4, background: S.surfaceHi2, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: '15%', height: '100%', background: S.greenBright }} />
            </div>
          </div>
        </div>

        {/* Recent playback */}
        <div style={{
          padding: '4px 20px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.textMute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            최근 재생
          </div>
          <div style={{ fontSize: 11, color: S.textDim }}>{HISTORY.length}개</div>
        </div>

        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '4px 20px 12px',
        }}>
          {HISTORY.map((row, i) => (
            <HistoryRow key={i} row={row} />
          ))}
        </div>

        {/* Safe area for home indicator */}
        <div style={{ padding: '0 0 22px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 134, height: 5, background: 'rgba(255,255,255,0.5)', borderRadius: 3 }} />
        </div>
      </div>
    </div>
  );
}

// — Variant B: Centered card modal (alternative) —
function AccountModal() {
  return (
    <div style={{
      width: 390, height: 844,
      fontFamily: F.sans, position: 'relative', overflow: 'hidden',
      background: '#000',
    }}>
      <BackdropPlayer />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.62)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }} />

      {/* Centered sheet */}
      <div style={{
        position: 'absolute', left: 16, right: 16, top: 72, bottom: 24,
        background: S.surface,
        borderRadius: 14,
        border: `1px solid rgba(255,255,255,0.06)`,
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
        display: 'flex', flexDirection: 'column',
        color: S.text,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px 12px',
          borderBottom: `1px solid ${S.divider}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Ico.User size={18} stroke={S.text} />
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>내 계정</div>
          </div>
          <button style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            color: S.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico.X size={16} />
          </button>
        </div>

        {/* Profile band — full bleed green-tinted */}
        <div style={{
          padding: '20px 18px 18px',
          background: 'linear-gradient(180deg, rgba(29,185,84,0.18) 0%, rgba(29,185,84,0) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1DB954 0%, #0E7C39 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#000', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(29,185,84,0.35)',
            }}>M</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>me@dorothy.app</div>
              <div style={{ fontSize: 11, color: S.textMute, marginTop: 3 }}>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>312 MB / 2.0 GB</span> 사용 중
              </div>
            </div>
          </div>
        </div>

        {/* Recent label */}
        <div style={{
          padding: '14px 18px 6px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.textMute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            최근 재생
          </div>
          <div style={{ fontSize: 11, color: S.textDim }}>{HISTORY.length}개</div>
        </div>

        {/* List */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 14px',
        }}>
          {HISTORY.map((row, i) => (
            <HistoryRow key={i} row={row} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px 16px',
          borderTop: `1px solid ${S.divider}`,
        }}>
          <button style={{
            width: '100%', height: 44, borderRadius: 999,
            background: 'transparent', border: `1px solid rgba(255,255,255,0.22)`,
            color: S.text, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Ico.LogOut size={16} />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

window.AccountSheet = AccountSheet;
window.AccountModal = AccountModal;
