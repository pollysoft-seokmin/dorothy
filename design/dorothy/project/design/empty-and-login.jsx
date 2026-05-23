// Empty / drop zone state (logged-out home) and Login screens, mobile size.
const S = window.SPOT;
const F = window.SPOT_FONT;

function EmptyState() {
  return (
    <div style={{
      width: 390, height: 844,
      background: S.bg,
      color: S.text,
      fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <UI.StatusBar />
      <UI.AppHeader user="?" />

      {/* Top gradient breath */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 360,
        background: 'radial-gradient(80% 100% at 50% 0%, rgba(29,185,84,0.18) 0%, rgba(0,0,0,0) 100%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', padding: '24px 24px 0', flex: 1,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Headline */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: S.greenBright, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            로컬 미디어 · 카라오케 가사
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: 8 }}>
            노래로 외우는<br/>가장 빠른 방법.
          </div>
          <div style={{ fontSize: 14, color: S.textMute, marginTop: 12, lineHeight: 1.5 }}>
            MP3·MP4와 .lrc / .smi 자막을 더해 한 줄씩 외워 보세요. 파일은 절대 업로드되지 않습니다.
          </div>
        </div>

        {/* Drop zone */}
        <div style={{
          marginTop: 28, padding: '32px 20px',
          borderRadius: 12,
          border: `1.5px dashed rgba(255,255,255,0.18)`,
          background: 'rgba(255,255,255,0.025)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: S.greenSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: S.greenBright,
          }}>
            <Ico.Upload size={24} />
          </div>
          <div style={{ fontSize: 14, color: S.textMute }}>
            여기에 파일을 드롭하거나 탭하여 선택
          </div>
          <div style={{ fontSize: 11, color: S.textDim }}>
            mp3 · mp4 · webm · mov · mpg · lrc · smi
          </div>
        </div>

        {/* Big CTA */}
        <button style={{
          marginTop: 16, width: '100%', height: 52, borderRadius: 999,
          background: S.greenBright, color: '#000', border: 'none',
          fontFamily: F.sans, fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(29,215,96,0.35)',
        }}>
          파일 선택하기
        </button>

        {/* Secondary line */}
        <div style={{
          marginTop: 22, fontSize: 12, color: S.textDim, textAlign: 'center',
        }}>
          <span>라이브러리에 보관하려면 </span>
          <a style={{ color: S.text, textDecoration: 'underline', fontWeight: 600 }}>로그인</a>
        </div>

        <div style={{ flex: 1 }} />

        {/* Bottom tip card */}
        <div style={{
          marginBottom: 28, padding: '14px 16px',
          background: S.surface, borderRadius: 10,
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: S.surfaceHi, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: S.greenBright,
          }}>
            <Ico.Mic size={18} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: S.text }}>
              구간 반복으로 한 줄씩 마스터
            </div>
            <div style={{ fontSize: 11, color: S.textMute, marginTop: 2, lineHeight: 1.4 }}>
              가사 옆 체크박스를 켜고 ↻ 버튼으로 N회 반복.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen() {
  return (
    <div style={{
      width: 390, height: 844,
      background: S.bg,
      color: S.text,
      fontFamily: F.sans,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* ambient gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(60% 50% at 50% 10%, rgba(29,185,84,0.22) 0%, rgba(0,0,0,0) 100%)',
        pointerEvents: 'none',
      }} />

      <UI.StatusBar />

      <div style={{ position: 'relative', flex: 1, padding: '24px 32px', display: 'flex', flexDirection: 'column' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
          <Ico.DorothyMark size={40} />
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>Dorothy</div>
        </div>

        {/* Heading */}
        <div style={{ marginTop: 56 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            로그인
          </div>
          <div style={{ fontSize: 13, color: S.textMute, marginTop: 8 }}>
            이메일 또는 Google 계정으로 계속하세요.
          </div>
        </div>

        {/* Form */}
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: S.textMute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>이메일</label>
          <div style={{
            height: 52, background: S.surfaceHi, borderRadius: 6,
            padding: '0 16px', display: 'flex', alignItems: 'center',
            color: S.text, fontSize: 15,
          }}>me@dorothy.app</div>

          <label style={{ fontSize: 11, fontWeight: 700, color: S.textMute, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 8 }}>비밀번호</label>
          <div style={{
            height: 52, background: S.surfaceHi, borderRadius: 6,
            padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: S.text, fontSize: 15,
          }}>
            <span style={{ letterSpacing: '0.3em' }}>••••••••</span>
            <Ico.Eye size={18} stroke={S.textMute} />
          </div>
        </div>

        {/* Primary */}
        <button style={{
          marginTop: 22, width: '100%', height: 52, borderRadius: 999,
          background: S.greenBright, color: '#000', border: 'none',
          fontFamily: F.sans, fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em',
          cursor: 'pointer',
        }}>
          로그인
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginTop: 22,
          color: S.textDim, fontSize: 11, fontWeight: 600, letterSpacing: '0.18em',
        }}>
          <div style={{ flex: 1, height: 1, background: S.divider }} />
          또는
          <div style={{ flex: 1, height: 1, background: S.divider }} />
        </div>

        {/* Google */}
        <button style={{
          marginTop: 16, width: '100%', height: 52, borderRadius: 999,
          background: 'transparent', color: S.text,
          border: `1px solid rgba(255,255,255,0.3)`,
          fontFamily: F.sans, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
            <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z" fill="#34A853"/>
            <path d="M4.5 10.48a4.8 4.8 0 010-3.07V5.34H1.83a8 8 0 000 7.15l2.67-2.01z" fill="#FBBC05"/>
            <path d="M8.98 4.18c1.18 0 2.23.4 3.06 1.2l2.31-2.3A8 8 0 001.83 5.35L4.5 7.4a4.77 4.77 0 014.48-3.22z" fill="#EA4335"/>
          </svg>
          Google로 계속하기
        </button>

        <div style={{ flex: 1 }} />

        <div style={{ fontSize: 12, color: S.textMute, textAlign: 'center', marginBottom: 24 }}>
          계정이 없으세요? <span style={{ color: S.text, fontWeight: 700, textDecoration: 'underline' }}>회원가입</span>
        </div>
      </div>
    </div>
  );
}

window.EmptyState = EmptyState;
window.LoginScreen = LoginScreen;
