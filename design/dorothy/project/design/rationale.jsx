// Rationale card — explains the direction in plain Korean.
const S = window.SPOT;
const F = window.SPOT_FONT;

function RationaleCard() {
  const Pillar = ({ num, title, body }) => (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: S.greenBright, color: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800, fontFamily: F.sans,
      }}>{num}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: S.text, letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ fontSize: 13, color: S.textMute, marginTop: 4, lineHeight: 1.55 }}>{body}</div>
      </div>
    </div>
  );

  return (
    <div style={{
      width: 720, height: 900,
      background: S.bg, color: S.text, fontFamily: F.sans,
      padding: 40, display: 'flex', flexDirection: 'column', gap: 24,
      boxSizing: 'border-box',
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: S.greenBright, textTransform: 'uppercase' }}>
          Proposal · Dorothy v2
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', marginTop: 8, lineHeight: 1.05 }}>
          Spotify의 톤으로<br/>가사 학습에 최적화.
        </div>
        <div style={{ fontSize: 14, color: S.textMute, marginTop: 12, lineHeight: 1.55 }}>
          현재의 shadcn neutral 테마는 깔끔하지만 정체성이 옅고, 가사가 페이지에서 가장 큰 시각적 자산임에도 그 위계가 약합니다.
          Spotify의 다크 베이스 + 절제된 그린을 차용해 "지금 부르고 있는 한 줄"을 무대 위 라이트처럼 떠올리도록 재구성합니다.
        </div>
      </div>

      <div style={{ height: 1, background: S.divider }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Pillar
          num="1"
          title="다크 전용 · 가사 중심 레이아웃"
          body="prefers-color-scheme 분기 제거. 검정 → 회색 4단계로 패널을 쌓고, 가사 위/아래에 fade-mask를 둬 활성 라인이 무대 위 스포트라이트처럼 떠오릅니다."
        />
        <Pillar
          num="2"
          title="Spotify Green은 '재생'에만"
          body="primary 토큰을 #1DB954/#1ED760로 두되 — 사용은 ▶ 버튼, 활성 인디케이터, 체크된 구간, 진행 그래프에만 한정. 텍스트 강조에는 흰색을, 부정·삭제에는 #F15E6C."
        />
        <Pillar
          num="3"
          title="원형 Play 버튼이 시각적 닻"
          body="현재의 ghost icon 버튼 대신 64–72px 흰색 원형 ▶ 버튼을 하단 중앙에 고정. RepeatControl/Expose/Language는 회색 ghost로 한 단계 낮춰 위계 정리."
        />
        <Pillar
          num="4"
          title="가사 타이포그래피 재설계"
          body="활성 라인 24–32px / Manrope 800, 다음 라인은 19–22px / opacity 0.85, 지난 라인은 opacity 0.5로 자연스러운 감쇠. SAMI 이중언어는 영문 헤드라인 + 한글 보조 라인 패턴으로 통일."
        />
        <Pillar
          num="5"
          title="라이브러리는 sidebar 다크 패널로"
          body="우측 aside 배경을 #121212로 분리하고 헤더에 용량 게이지를 얇은 그린 바로. 업로드 진행은 row 하단 1.5px 라인이 채워지는 방식 (현재 코드의 구조 그대로, 톤만 교체)."
        />
        <Pillar
          num="6"
          title="브랜드 마크 추가"
          body="현재는 'Dorothy' 워드마크만 존재. 마이크 글리프를 담은 그린 원형 마크를 추가해 헤더·favicon·login에서 카라오케 정체성을 빠르게 전달."
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* footer */}
      <div style={{
        background: S.surface, borderRadius: 10, padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 6, flexShrink: 0,
          background: S.surfaceHi, color: S.greenBright,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ico.Music size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>구현 비용</div>
          <div style={{ fontSize: 12, color: S.textMute, marginTop: 2, lineHeight: 1.5 }}>
            대부분 <code style={{ background: S.surfaceHi2, padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>app.css</code>의 토큰 교체로 끝납니다.
            컴포넌트 구조 변경은 PlaybackControls(원형 버튼화)와 AuthHeader(마크 추가)만 손대면 충분.
          </div>
        </div>
      </div>
    </div>
  );
}

window.RationaleCard = RationaleCard;
