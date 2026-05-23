// Now Playing — Video variant: video on top, lyrics underneath.
const S = window.SPOT;
const F = window.SPOT_FONT;

function NowPlayingVideo() {
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
      <UI.AppHeader />

      {/* Video frame 16:9 */}
      <div style={{ padding: '4px 20px 16px', flexShrink: 0 }}>
        <div style={{
          width: '100%', aspectRatio: '16 / 9',
          background: 'linear-gradient(135deg, #c9461e 0%, #f9d34a 60%, #e89527 100%)',
          borderRadius: 8,
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {/* burger emoji stand-in for video */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 96,
          }}>🍔</div>
          {/* video chrome */}
          <div style={{
            position: 'absolute', left: 12, bottom: 10,
            fontSize: 11, fontWeight: 700, padding: '3px 8px',
            background: 'rgba(0,0,0,0.55)', color: S.text, borderRadius: 4,
            letterSpacing: '0.05em',
          }}>HD</div>
        </div>
        <div style={{
          marginTop: 12, fontSize: 14, fontWeight: 600, color: S.text,
          textAlign: 'center', letterSpacing: '-0.01em',
        }}>
          Wisconsin_Man_Hit_Big_Mac_Milestone
        </div>
      </div>

      {/* Lyrics-less placeholder mid section */}
      <div style={{
        flex: 1, minHeight: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 10, color: S.textDim, padding: '0 32px', textAlign: 'center',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico.FileText size={26} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: S.textMute }}>가사가 없습니다</div>
        <div style={{ fontSize: 12, color: S.textDim, maxWidth: 220, lineHeight: 1.5 }}>
          영상과 같은 이름의 .lrc 또는 .smi 파일을 라이브러리에 함께 올리면 자동으로 표시됩니다.
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{ padding: '12px 20px 28px', flexShrink: 0 }}>
        <UI.Progress pct={0.62} current="00:38" total="01:01" />

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center', marginTop: 14,
        }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <UI.IconBtn disabled>
              <Ico.Repeat size={18} />
            </UI.IconBtn>
          </div>
          <UI.PlayCircle playing={true} size={68} />
          <div style={{ display: 'flex', gap: 0, justifySelf: 'end' }}>
            <UI.IconBtn disabled>
              <Ico.EyeOff size={18} />
            </UI.IconBtn>
            <UI.IconBtn disabled>
              <Ico.Globe size={18} />
            </UI.IconBtn>
          </div>
        </div>

        <div style={{
          width: 134, height: 5, background: S.text, opacity: 0.6,
          borderRadius: 3, margin: '14px auto 0',
        }} />
      </div>
    </div>
  );
}

window.NowPlayingVideo = NowPlayingVideo;
