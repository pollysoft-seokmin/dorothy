# Dorothy

로컬 미디어 파일을 브라우저에서 재생하고 LRC 가사를 시간에 맞춰 표시하는 웹 기반 미디어 플레이어.

모든 처리는 브라우저 안에서 수행되며 사용자의 파일은 서버로 업로드되지 않습니다. 브라우저가 직접 디코드하지 못하는 비디오 컨테이너(.mpg/.mpeg/.avi/.mkv 등)는 ffmpeg.wasm으로 클라이언트에서 H.264/AAC MP4로 변환한 뒤 재생합니다.

## 주요 기능

- 로컬 오디오·비디오 재생 (MP3 / MP4 / WebM / MOV)
- 비호환 비디오의 자동 클라이언트 트랜스코딩 (.mpg, .mpeg, .m4v, .avi, .mkv, .flv, .wmv, .3gp)
- LRC 가사 동기화 + 카라오케 스타일 활성 라인 강조
- 구간 반복 / 전체 반복 / Seek / 볼륨 / 음소거
- 키보드 단축키 (Space, ←/→, ↑/↓, M)
- MP3 ID3 메타데이터(제목·아티스트·앨범·앨범아트) 직접 파싱
- 파일 Drag & Drop, 모바일 `playsInline`

## 지원 파일 형식

| 종류 | 확장자 | 처리 방식 |
|------|--------|-----------|
| 오디오 | `.mp3` | 브라우저 네이티브 + ID3 파싱 |
| 비디오 (네이티브) | `.mp4`, `.webm`, `.mov` | `<video>` 직접 재생 (코덱이 비호환이면 자동으로 트랜스코드 경로로 fallback) |
| 비디오 (트랜스코드) | `.mpg`, `.mpeg`, `.m4v`, `.avi`, `.mkv`, `.flv`, `.wmv`, `.3gp` | ffmpeg.wasm으로 H.264/AAC MP4 변환 후 재생 |
| 가사 | `.lrc` | UTF-8, 라인 단위 타임스탬프 |

## Quickstart

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # 프로덕션 빌드 (.output/)
pnpm start        # 빌드 결과 실행
```

## 사용 방법

1. 드롭 영역을 클릭하거나 미디어 파일을 드래그 앤 드롭합니다.
2. 필요하면 같은 방식으로 `.lrc` 가사 파일을 추가합니다.
3. Play를 누르거나 `Space`로 재생합니다.

| 키 | 동작 |
|----|------|
| `Space` | 재생/일시정지 |
| `←` / `→` | 5초 뒤/앞 Seek |
| `↑` / `↓` | 볼륨 ±10% |
| `M` | 음소거 토글 |

입력 필드에 포커스가 있으면 단축키는 비활성화됩니다.

## 클라이언트 트랜스코딩

브라우저가 디코드하지 못하는 비디오는 `src/lib/transcode.ts`의 `transcodeToMp4()`가 ffmpeg.wasm으로 변환합니다.

- 코어: `@ffmpeg/core@0.12.10` (single-thread, SharedArrayBuffer 불필요)
- lazy import + CDN(unpkg)에서 코어(~25MB)를 첫 사용 시 1회만 로드, 이후 세션 재사용
- 변환 옵션: `libx264 -preset ultrafast -pix_fmt yuv420p` + `aac 128k` + `+faststart`
- `.mpg/.mpeg/.avi/.mkv/.flv/.wmv/.3gp`는 항상 트랜스코드, 컨테이너만 호환인 `.mp4/.webm/.mov`는 먼저 재생 가능 여부를 프로브한 뒤 실패 시에만 트랜스코드

ffmpeg worker URL이 Vite dev pre-bundling에서 깨지는 문제 때문에 `vite.config.ts`에서 `optimizeDeps.exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']` 설정이 필요합니다.

## 테스트

```bash
pnpm test:e2e             # Playwright headless
pnpm test:e2e:ui          # Playwright UI 모드
pnpm exec tsc --noEmit    # 타입 체크
```

E2E fixture는 `e2e/fixtures/` 안에 포함돼 있고, 실제 비디오 트랜스코드 경로(MPEG-1, MPEG-2 + AC3, MPEG-4 Part 2, Xvid 등)를 검증합니다.

## 개인정보

- 미디어 파일은 서버로 업로드되지 않습니다 (File API + Object URL)
- 트랜스코딩도 브라우저 안의 ffmpeg.wasm으로 수행됩니다
- 첫 트랜스코드 시 ffmpeg.wasm core만 CDN(unpkg)에서 다운로드합니다

## 더 자세한 내용

설계, 컴포넌트·훅·스토어 명세, 데이터 타입, 레이아웃, LRC/ID3 파서 동작, 에러 처리 전략은 [SPEC.md](./SPEC.md)를 참고하세요.

## 기술 스택

React 19 · TypeScript · TanStack Start · Vite 7 · Tailwind CSS v4 · shadcn/ui · Radix UI · Zustand · Sonner · Lucide · ffmpeg.wasm · Playwright · pnpm

## 라이선스

라이선스 파일은 아직 포함돼 있지 않습니다.
