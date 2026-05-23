// Desktop account popup — centered modal that reuses the mobile Bottom Sheet layout.
// Backdrop = dimmed desktop layout (player + library aside).
const S = window.SPOT;
const F = window.SPOT_FONT;

const HISTORY_D = [
  { title: 'Bad Moon Rising',             artist: 'Creedence Clearwater Revival', when: '방금 전',   kind: 'audio', playing: true },
  { title: 'Have You Ever Seen the Rain', artist: 'Creedence Clearwater Revival', when: '15분 전',   kind: 'audio' },
  { title: 'Susie Q live 1970',           artist: 'CCR',                          when: '1시간 전',  kind: 'video' },
  { title: 'Fortunate Son',               artist: 'Creedence Clearwater Revival', when: '어제',      kind: 'audio' },
  { title: 'Proud Mary',                  artist: 'Creedence Clearwater Revival', when: '어제',      kind: 'audio' },
  { title: 'Down on the Corner',          artist: 'Creedence Clearwater Revival', when: '2일 전',    kind: 'audio' },
  { title: 'Lookin\' Out My Back Door',   artist: 'Creedence Clearwater Revival', when: '3일 전',    kind: 'audio' },
];

function HistoryRowD({ row }) {
  const Icon = row.kind === 'video' ? Ico.Film : Ico.Music;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 4px',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 4, flexShrink: 0,
        background: S.surfaceHi,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: row.playing ? S.greenBright : S.textMute,
      }}>
        {row.playing ? (
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 16 }}>
            <div style={{ width: 3, height: 9,  background: S.greenBright, borderRadius: 1 }} />
            <div style={{ width: 3, height: 16, background: S.greenBright, borderRadius: 1 }} />
            <div style={{ width: 3, height: 7,  background: S.greenBright, borderRadius: 1 }} />
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

// — Backdrop: a small-scale rendering of the DesktopLayout, dimmed —
function DesktopBackdrop() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      filter: 'brightness(0.4)',
    }}>
      <DesktopLayout />
    </div>
  );
}

function AccountDesktopModal() {
  // Card sized like the mobile sheet (390 wide) but with desktop-appropriate height
  const CARD_W = 440;
  const CARD_H = 680;

  return (
    <div style={{
      width: 1280, height: 800,
      fontFamily: F.sans, position: 'relative', overflow: 'hidden',
      background: '#000',
    }}>
      <DesktopBackdrop />

      {/* Dim + blur overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }} />

      {/* Centered modal — identical content blocks to the mobile Bottom Sheet (A) */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: CARD_W, maxHeight: CARD_H,
        background: S.surface,
        borderRadius: 16,
        border: `1px solid rgba(255,255,255,0.06)`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02)',
        display: 'flex', flexDirection: 'column',
        color: S.text,
        overflow: 'hidden',
      }}>
        {/* Header row — title + close (replaces drag handle from mobile) */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px 10px',
        }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.02em' }}>내 계정</div>
          <button style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            color: S.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Ico.X size={18} />
          </button>
        </div>

        {/* Profile card — identical to mobile sheet */}
        <div style={{ padding: '8px 22px 18px' }}>
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

          {/* Storage usage mini — identical */}
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

        {/* Recent playback label */}
        <div style={{
          padding: '4px 22px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S.textMute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            최근 재생
          </div>
          <div style={{ fontSize: 11, color: S.textDim }}>{HISTORY_D.length}개</div>
        </div>

        {/* Scrollable list */}
        <div style={{
          flex: 1, minHeight: 0, overflowY: 'auto',
          padding: '4px 22px 18px',
        }}>
          {HISTORY_D.map((row, i) => (
            <HistoryRowD key={i} row={row} />
          ))}
        </div>
      </div>
    </div>
  );
}

window.AccountDesktopModal = AccountDesktopModal;
