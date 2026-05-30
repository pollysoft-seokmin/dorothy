# Dorothy

브라우저에서 오디오·비디오를 재생하고 동기화 가사를 함께 보여주는 웹 기반 미디어 플레이어입니다.

비로그인 상태에서는 로컬 파일을 브라우저 안에서 바로 재생합니다. 로그인하면 개인 미디어 라이브러리에 파일을 업로드하고, 폴더로 정리하며, 최근 재생과 가사 표시 환경설정을 계정에 저장할 수 있습니다.

## 주요 기능

- 로컬 오디오·비디오 재생
- 로그인 사용자용 미디어 라이브러리
- Vercel Blob 업로드, 폴더 생성/이름 변경/삭제, 파일 이름 변경/삭제
- 사용자별 1GB 저장공간 제한 및 오디오/비디오/가사 용량 표시
- 비호환 비디오의 클라이언트 트랜스코딩
- MP3 ID3 메타데이터(제목·아티스트·앨범·앨범아트) 파싱
- Polly 포맷 임베디드 SAMI trailer 가사 추출
- 같은 폴더의 동일 basename `.lrc` 사이드카 가사 자동 연결
- SAMI 가사 언어 토글(영어+한국어 / 영어 / 한국어) 및 계정별 저장
- 라인별/전체 가사 마스킹, 가사 라인 클릭 Seek, 선택 구간 반복
- 최근 재생 목록 및 최근 재생 항목 클릭 재생
- 데스크톱/모바일 반응형 UI, 모바일 `playsInline`

## 기술 스택

React 19 · TypeScript · TanStack Start · TanStack Router · Vite 7 · Tailwind CSS v4 · shadcn/ui · Radix UI · Zustand · Better Auth · Drizzle ORM · Postgres · Vercel Blob · Sonner · Lucide · ffmpeg.wasm · Playwright · pnpm

## 지원 파일 형식

| 종류 | 확장자 | 처리 방식 |
|------|--------|-----------|
| 오디오 | `.mp3` | 브라우저 네이티브 재생, 로컬 파일은 ID3 파싱 |
| 비디오(네이티브) | `.mp4`, `.webm`, `.mov`, `.m4v` | 먼저 브라우저 재생 가능 여부를 확인하고 실패 시 트랜스코드 |
| 비디오(트랜스코드) | `.mpg`, `.mpeg`, `.avi`, `.mkv`, `.flv`, `.wmv`, `.3gp` | ffmpeg.wasm으로 H.264/AAC MP4 변환 후 재생 또는 업로드 |
| 가사 | `.lrc` | 라이브러리에서 같은 폴더의 동일 basename 미디어와 자동 연결 |
| 가사 | Polly SAMI trailer | 미디어 파일 끝의 암호화된 SAMI trailer를 추출해 표시 |

## Quickstart

```bash
pnpm install
cp .env.example .env.local
pnpm db:push
pnpm dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

## 환경 변수

`.env.local`에 다음 값을 설정합니다.

```bash
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_TRUSTED_ORIGINS=""
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

- `DATABASE_URL`: Postgres 연결 문자열입니다. Neon을 쓰는 경우 pooled connection string을 사용합니다.
- `BETTER_AUTH_SECRET`: `openssl rand -base64 32` 등으로 생성합니다.
- `BLOB_READ_WRITE_TOKEN`: 로그인 사용자 라이브러리 업로드에 필요합니다.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google 로그인 사용 시 설정합니다. 비워두면 이메일/비밀번호 로그인만 사용합니다.

## 스크립트

```bash
pnpm dev              # 개발 서버
pnpm build            # 타입 체크 + 프로덕션 빌드
pnpm start            # 빌드 결과 실행
pnpm db:generate      # Drizzle migration 생성
pnpm db:push          # schema를 DB에 반영
pnpm db:studio        # Drizzle Studio 실행
pnpm test:e2e         # Playwright headless
pnpm test:e2e:ui      # Playwright UI 모드
pnpm exec tsc --noEmit
```

## 사용 방법

비로그인 상태:

1. 드롭 영역을 클릭하거나 미디어 파일을 드래그 앤 드롭합니다.
2. 재생 버튼 또는 `Space`로 재생/일시정지합니다.
3. 가사가 포함된 Polly SAMI trailer 파일이면 자동으로 가사가 표시됩니다.

로그인 상태:

1. `/signup`에서 이메일 계정을 만들거나 Google로 로그인합니다.
2. 우측 라이브러리(모바일은 시트)에서 오디오·비디오·`.lrc` 파일을 업로드합니다.
3. 파일을 클릭해 재생합니다. 같은 폴더에 `song.mp3`와 `song.lrc`처럼 동일 basename 파일이 있으면 LRC가 자동 연결됩니다.
4. 계정 메뉴에서 최근 재생 항목을 다시 열 수 있습니다.

| 키 | 동작 |
|----|------|
| `Space` | 재생/일시정지 |
| `←` / `→` | 5초 뒤/앞 Seek |

입력 필드에 포커스가 있으면 단축키는 비활성화됩니다.

## 클라이언트 트랜스코딩

브라우저가 디코드하지 못하는 비디오는 `src/lib/transcode.ts`의 `transcodeToMp4()`가 ffmpeg.wasm으로 변환합니다.

- 코어: `@ffmpeg/core@0.12.10` single-thread 빌드
- 첫 변환 시 ffmpeg core를 CDN에서 lazy load
- 변환 옵션: `libx264 -preset ultrafast -pix_fmt yuv420p` + `aac 128k` + `+faststart`
- 라이브러리 업로드 중 비디오를 변환할 때 Polly SAMI trailer가 있으면 변환 결과 뒤에 다시 붙입니다.
- `vite.config.ts`에서 `@ffmpeg/ffmpeg`, `@ffmpeg/util`은 Vite pre-bundling 제외 대상입니다.

## 개인정보와 저장소

- 비로그인 로컬 파일 재생은 File API와 Object URL을 사용하며 파일을 서버로 업로드하지 않습니다.
- 로그인 라이브러리에 업로드한 파일은 Vercel Blob에 저장되고, 메타데이터/폴더/최근 재생/환경설정은 Postgres에 저장됩니다.
- 트랜스코딩은 브라우저 안의 ffmpeg.wasm으로 수행됩니다.

## 참고

설계와 구현 세부사항은 [SPEC.md](./SPEC.md)를 참고하세요.

## 라이선스

라이선스 파일은 아직 포함돼 있지 않습니다.
