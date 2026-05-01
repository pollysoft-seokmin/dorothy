# Dorothy - Local MP3 Player Web Application

## 1. Overview

Dorothy는 사용자가 로컬 MP3 파일을 선택하여 브라우저에서 재생하고, 동기화된 가사(LRC)를 카라오케 스타일로 표시하는 웹 애플리케이션입니다. 모든 처리는 클라이언트에서 수행되며, 서버에 파일을 업로드하지 않습니다.

### 1.1 핵심 기능

| 기능 | 설명 |
|------|------|
| 파일 선택 | Drag & Drop (데스크톱) 또는 파일 선택 버튼으로 MP3/LRC 로드 |
| 재생 컨트롤 | Play/Pause 토글, Stop, 반복 재생 토글 |
| Progress Bar | 현재 재생 위치 실시간 표시 및 Seek (클릭/드래그) |
| 시간 표시 | 현재 시간 / 전체 시간 (`01:23 / 04:56`) |
| 볼륨 조절 | 슬라이더 볼륨 조절 + 음소거 토글 |
| 가사 표시 | LRC 파일 로드 시 카라오케 스타일 시간 동기화 가사 |
| ID3 메타데이터 | MP3의 제목, 아티스트, 앨범 아트 썸네일 표시 |
| 키보드 단축키 | Space, 화살표, M 등 기본 단축키 지원 |

### 1.2 설계 원칙

- **CSR 전용**: TanStack Start를 사용하되, 오디오/파일 로직은 100% 클라이언트 사이드. SSR은 초기 HTML 셸만 제공.
- **서버 업로드 없음**: File API + ObjectURL로 클라이언트에서만 처리 (보안 & 개인정보 보호).
- **외부 의존성 최소화**: LRC 파서와 ID3 태그 리더 모두 직접 구현 (외부 라이브러리 없음).

---

## 2. Tech Stack

### 2.1 Framework & Runtime

| 기술 | 버전 | 용도 |
|------|------|------|
| [TanStack Start](https://tanstack.com/start/latest) | v1+ | Full-stack React 프레임워크 (file-based routing, CSR 모드) |
| [React](https://react.dev) | v19 | UI 라이브러리 |
| [TypeScript](https://www.typescriptlang.org) | v5.x | 타입 안전성 |
| [Vite](https://vite.dev) | v7.x | 빌드 도구 (TanStack Start 요구) |

### 2.2 Styling & UI Components

| 기술 | 용도 |
|------|------|
| [Tailwind CSS](https://tailwindcss.com) v4 | 유틸리티 기반 CSS (CSS-first 설정) |
| [shadcn/ui](https://ui.shadcn.com) | Headless UI 컴포넌트 (Button, Slider, Sonner 등) |
| [Radix UI](https://www.radix-ui.com) | shadcn/ui 기반 Primitive (Slider, Toggle 등) |
| [Lucide React](https://lucide.dev) | 아이콘 (Play, Pause, Stop, Volume, Repeat 등) |

### 2.3 Audio & Lyrics & Metadata

| 기술 | 용도 |
|------|------|
| [HTML5 Audio API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement) | MP3 재생, 시간 추적, Seek |
| 직접 구현 LRC 파서 (`src/lib/lrc-parser.ts`) | LRC 파일 파싱 (정규식 기반) |
| 직접 구현 ID3 리더 (`src/lib/id3-reader.ts`) | MP3 ID3v2.2/2.3/2.4 태그 바이너리 파싱 |

> **Web Audio API는 초기 버전에서 제외**합니다. 시각화(파형, 스펙트럼 등)는 향후 확장 사항입니다.
>
> **참고**: `jsmediatags`와 `lrc-kit`은 Vite 7에서 `exports` 필드 미지원으로 빌드 실패하여 제거하고 직접 구현으로 대체했습니다.

### 2.4 State Management

| 기술 | 용도 |
|------|------|
| [Zustand](https://zustand.docs.pmnd.rs) | 전역 상태 관리 (단일 스토어: `usePlayerStore`) |
| `useRef` + `requestAnimationFrame` | Audio Element 참조 및 부드러운 Progress 업데이트 |

**Progress 업데이트 전략:**
- `requestAnimationFrame` 루프로 `useRef`에 현재 시간을 저장
- 100ms 간격으로 Zustand store에 `setState` 동기화 (불필요한 리렌더 방지)
- ProgressBar는 Zustand 상태 기반 리렌더로 업데이트

### 2.5 Package Manager & Deployment

| 기술 | 용도 |
|------|------|
| [pnpm](https://pnpm.io) | 패키지 매니저 |
| [Vercel](https://vercel.com) | 호스팅 & 자동 배포 (기본 도메인 사용) |
| [Nitro](https://nitro.build) | TanStack Start 서버 런타임 (Vercel preset) |

---

## 3. Project Structure

```
dorothy/
├── src/
│   ├── routes/
│   │   ├── __root.tsx              # Root layout (HTML head, global providers)
│   │   └── index.tsx               # 메인 페이지 (플레이어 UI)
│   ├── components/
│   │   ├── player/
│   │   │   ├── AudioPlayer.tsx     # 플레이어 최상위 컴포넌트
│   │   │   ├── TrackInfo.tsx       # 곡 정보 (앨범 아트 썸네일 + 제목/아티스트)
│   │   │   ├── PlaybackControls.tsx # Play/Pause, Stop, Repeat 버튼
│   │   │   ├── ProgressBar.tsx     # Seek 가능한 Progress Bar
│   │   │   ├── TimeDisplay.tsx     # 현재시간 / 전체시간
│   │   │   ├── VolumeControl.tsx   # 볼륨 슬라이더 + 음소거
│   │   │   └── FileDropZone.tsx    # 파일 선택 / Drag & Drop 영역
│   │   └── lyrics/
│   │       ├── LyricsPanel.tsx     # 가사 패널 컨테이너 (카라오케 스타일)
│   │       └── LyricLine.tsx       # 개별 가사 라인 (활성 라인 하이라이트)
│   ├── hooks/
│   │   ├── useAudioPlayer.ts       # Audio Element 제어 커스텀 훅
│   │   ├── useLyrics.ts            # LRC 파싱 및 현재 가사 동기화 훅
│   │   └── useKeyboardShortcuts.ts # 키보드 단축키 훅
│   ├── stores/
│   │   └── player-store.ts         # Zustand 단일 스토어
│   ├── lib/
│   │   ├── lrc-parser.ts           # LRC 파일 파싱 유틸리티 (직접 구현, 정규식 기반)
│   │   ├── format-time.ts          # 시간 포맷 유틸리티 (초 → mm:ss)
│   │   └── id3-reader.ts           # 직접 구현 ID3v2 바이너리 파서
│   ├── types/
│   │   └── index.ts                # 공유 타입 정의
│   ├── styles/
│   │   └── app.css                 # Tailwind CSS v4 진입점
│   ├── router.tsx                  # TanStack Router 설정
│   └── routeTree.gen.ts            # 자동 생성 라우트 트리
├── public/
│   └── favicon.svg                # SVG 파비콘
├── package.json
├── tsconfig.json
└── vite.config.ts                  # Vite 설정 (TanStack Start 플러그인)
```

---

## 4. Core Data Types

```typescript
// types/index.ts

/** 오디오 재생 상태 */
export type PlayStatus = 'idle' | 'playing' | 'paused' | 'stopped'

/** ID3 메타데이터 */
export interface TrackMetadata {
  title?: string
  artist?: string
  album?: string
  albumArt?: string    // base64 data URL 또는 ObjectURL
}

/** Zustand 플레이어 스토어 상태 */
export interface PlayerStore {
  // 재생 상태
  status: PlayStatus
  currentTime: number       // 초 단위
  duration: number           // 초 단위
  volume: number             // 0.0 ~ 1.0
  isMuted: boolean
  isLooping: boolean

  // 파일 정보
  fileName: string
  metadata: TrackMetadata | null

  // 가사
  lyrics: ParsedLyrics | null
  currentLineIndex: number

  // 액션
  setStatus: (status: PlayStatus) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleLoop: () => void
  loadTrack: (fileName: string, metadata: TrackMetadata | null) => void
  loadLyrics: (lyrics: ParsedLyrics) => void
  setCurrentLineIndex: (index: number) => void
  reset: () => void
}

/** 파싱된 LRC 가사 라인 */
export interface LyricLine {
  time: number               // 초 단위 타임스탬프
  text: string               // 가사 텍스트
}

/** 파싱된 LRC 메타데이터 + 가사 */
export interface ParsedLyrics {
  title?: string
  artist?: string
  album?: string
  lines: LyricLine[]
}
```

---

## 5. Component Specifications

### 5.1 AudioPlayer (최상위 컴포넌트)

- `useAudioPlayer` 훅으로 `<audio>` 엘리먼트 제어
- `useKeyboardShortcuts` 훅으로 키보드 단축키 바인딩
- Zustand 스토어에서 상태 읽기, 하위 컴포넌트에 전달
- 숨겨진 `<audio>` 엘리먼트 렌더링
- 레이아웃 순서: 상단 파일 선택 → 곡 정보 → 중앙 가사 → 하단 컨트롤

### 5.2 FileDropZone

- `<input type="file" accept=".mp3,.lrc" multiple>` 로 파일 선택
- **데스크톱**: Drag & Drop 영역 + 클릭 파일 선택
  - `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` 이벤트
  - 드래그 중 시각적 피드백 (테두리 색상/배경 변경)
- **모바일**: 전용 레이아웃 — 큰 파일 선택 버튼을 메인으로 표시 (드래그 안내 숨김)
- MP3와 LRC 동시 드롭 지원 (확장자로 분류)
- **재생 중 파일 교체**: 즉시 현재 재생 중단 → 새 파일 로드 → 대기 상태 (기존 LRC도 초기화)
- MP3 선택 시:
  1. `URL.createObjectURL(file)` 로 Audio src 설정
  2. 직접 구현 ID3 리더로 태그 읽기 → TrackMetadata 생성
- LRC 선택 시: `FileReader.readAsText()` → LRC 파싱

### 5.3 TrackInfo

- ID3 태그에서 추출한 앨범 아트를 **썸네일**로 표시 (48x48 ~ 64x64)
- 제목 / 아티스트 텍스트 표시
- ID3 태그가 없으면 파일명을 제목으로, 아티스트는 비표시
- 앨범 아트가 없으면 기본 음악 아이콘(Lucide `Music`) 표시
- LRC 메타데이터(`[ti:]`, `[ar:]`)가 있으면 ID3보다 우선하지 않음 (ID3 우선, 없을 때 LRC fallback)

### 5.4 PlaybackControls

| 버튼 | 아이콘 | 동작 |
|------|--------|------|
| Play/Pause | `<Play />` ↔ `<Pause />` | 토글: 재생 중이면 일시정지, 아니면 재생 |
| Stop | `<Square />` | `audio.pause()` + `audio.currentTime = 0` → status: `stopped` |
| Repeat | `<Repeat />` | 반복 재생 토글 (활성 시 아이콘 강조 색상) |

- 파일 미로드 시 모든 버튼 `disabled`
- Play/Pause 토글 버튼이 중앙, Stop이 옆, Repeat이 끝
- **수동 재생**: 파일 로드 후 자동 재생하지 않음 (사용자가 Play 클릭 필요)

### 5.5 ProgressBar

- shadcn/ui `<Slider>` 기반 (min=0, max=duration, step=0.1)
- `requestAnimationFrame` + `useRef`로 재생 중 실시간 업데이트
- 100ms 간격으로 Zustand에 동기화, ProgressBar는 Zustand 상태 기반 리렌더
- 사용자 드래그/클릭 시 Seek: `audio.currentTime = seekPosition`
- **드래그 중 flickering 방지**: `isDragging` 상태 추적, 드래그 중에는 rAF 값으로 업데이트하지 않음
- 파일 미로드 시 비활성화 (`disabled`)

### 5.6 TimeDisplay

- 포맷: `mm:ss / mm:ss` (현재시간 / 전체시간)
- `formatTime(seconds)` 유틸리티 사용
- ProgressBar와 같은 행 또는 바로 아래에 배치

### 5.7 VolumeControl

- shadcn/ui `<Slider>` (min=0, max=100, step=1)
- 볼륨 아이콘 (상태에 따라 변경):
  - 음소거: `<VolumeX />`
  - 볼륨 0: `<Volume />`
  - 볼륨 ≤ 50: `<Volume1 />`
  - 볼륨 > 50: `<Volume2 />`
- 아이콘 클릭 → 음소거 토글
- `audio.volume` (0.0~1.0) 및 `audio.muted` 제어

### 5.8 LyricsPanel (카라오케 스타일)

**LRC 미로드 시:**
- "LRC 파일을 추가하면 가사가 표시됩니다" 안내 메시지
- LRC 파일 추가 버튼 제공

**LRC 로드 시:**
- 스크롤 가능한 영역에 전체 가사 목록 표시
- **활성 라인**: 크게/볼드로 강조, 밝은 색상
- **비활성 라인**: 작게, 반투명 처리 (`opacity-40` ~ `opacity-60`)
- 활성 라인이 항상 뷰포트 **중앙에 고정**: `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- 가사 라인 클릭 시 해당 타임스탬프로 Seek

### 5.9 LyricLine

- `isActive` prop에 따라 스타일 전환
  - 활성: `text-lg font-bold text-foreground` + scale 효과
  - 비활성: `text-sm text-muted-foreground opacity-50`
- 클릭 시 `onClick` → 해당 `line.time`으로 Seek
- 활성 라인에 `ref` 부착 (scrollIntoView 대상)

---

## 6. Zustand Store

```typescript
// stores/player-store.ts
import { create } from 'zustand'

export const usePlayerStore = create<PlayerStore>((set) => ({
  // 초기 상태
  status: 'idle',
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  isLooping: false,
  fileName: '',
  metadata: null,
  lyrics: null,
  currentLineIndex: -1,

  // 액션
  setStatus: (status) => set({ status }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleLoop: () => set((s) => ({ isLooping: !s.isLooping })),
  loadTrack: (fileName, metadata) => set({
    fileName,
    metadata,
    status: 'idle',
    currentTime: 0,
    duration: 0,
    lyrics: null,
    currentLineIndex: -1,
  }),
  loadLyrics: (lyrics) => set({ lyrics, currentLineIndex: -1 }),
  setCurrentLineIndex: (index) => set({ currentLineIndex: index }),
  reset: () => set({
    status: 'idle',
    currentTime: 0,
    duration: 0,
    fileName: '',
    metadata: null,
    lyrics: null,
    currentLineIndex: -1,
  }),
}))
```

---

## 7. Custom Hooks

### 7.1 `useAudioPlayer`

```typescript
function useAudioPlayer(): {
  audioRef: RefObject<HTMLAudioElement>
  play: () => void
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  loadFile: (file: File) => void
}
```

**구현 핵심:**
- `useRef<HTMLAudioElement>`로 `<audio>` 엘리먼트 참조
- `loadedmetadata` → Zustand에 `duration` 저장
- `ended` 이벤트:
  - `isLooping`이면 `audio.currentTime = 0; audio.play()`
  - 아니면 status → `stopped`, currentTime → 0
- `error` 이벤트 → Toast "오디오 파일을 재생할 수 없습니다" + 상태 초기화
- **rAF 루프**:
  - `useRef`에 `currentTime` 저장 (매 프레임)
  - 100ms 간격으로 `usePlayerStore.setState({ currentTime })` 호출
  - 가사 인덱스 업데이트도 rAF 내에서 이진 탐색으로 처리
- `loadFile` 시 기존 ObjectURL → `URL.revokeObjectURL()` 해제
- 컴포넌트 언마운트 시 cleanup: rAF 취소 + ObjectURL 해제
- `audio.volume`, `audio.muted` 는 Zustand 구독으로 동기화

### 7.2 `useLyrics`

```typescript
function useLyrics(): {
  loadLrcFile: (file: File) => void
}
```

**구현 핵심:**
- `FileReader.readAsText(file, 'utf-8')`로 LRC 파일 읽기
- 직접 구현한 `lrc-parser.ts`로 파싱
- 파싱 결과를 Zustand `loadLyrics()`에 저장
- UTF-8 깨짐 체크 (`\uFFFD` replacement character)
- 파싱 실패 시 Toast 에러 알림 표시
- **가사 인덱스 결정** (`getCurrentLineIndex`)은 `useAudioPlayer` rAF 루프 내에서 이진 탐색으로 처리

### 7.3 `useKeyboardShortcuts`

```typescript
function useKeyboardShortcuts(actions: {
  play: () => void
  pause: () => void
  seek: (time: number) => void
}): void
```

> 볼륨/음소거는 `usePlayerStore.getState()` 직접 호출로 처리합니다.

**키 바인딩:**

| 키 | 동작 |
|----|------|
| `Space` | Play/Pause 토글 |
| `←` (ArrowLeft) | 5초 뒤로 Seek |
| `→` (ArrowRight) | 5초 앞으로 Seek |
| `↑` (ArrowUp) | 볼륨 10% 증가 |
| `↓` (ArrowDown) | 볼륨 10% 감소 |
| `M` | 음소거 토글 |

**주의사항:**
- `event.preventDefault()`로 Space 스크롤 등 기본 동작 방지
- input/textarea 포커스 시 단축키 비활성화

---

## 8. LRC Parser

### 8.1 LRC 형식

```
[ti:곡 제목]
[ar:아티스트]
[al:앨범]
[00:12.34]첫 번째 가사 라인
[00:15.67]두 번째 가사 라인
[01:02.00]여러 타임스탬프 가능[01:30.00]같은 가사
```

### 8.2 파싱 전략

**Primary: 직접 구현** (`src/lib/lrc-parser.ts`)
1. 정규식 `\[(\d{2}):(\d{2})\.(\d{2,3})\]` 으로 타임스탬프 추출 → 초 단위 변환
2. 메타데이터 태그 (`[ti:]`, `[ar:]`, `[al:]`) 분리
3. 한 줄에 여러 타임스탬프 처리 (복수 타임스탬프 → 동일 텍스트로 복제)
4. 타임스탬프 기준 오름차순 정렬
5. 빈 라인 / 타임스탬프 없는 라인 무시

**에러 처리:**
- 파싱 결과 라인이 0개이면 Toast 에러: "LRC 파일을 파싱할 수 없습니다"
- 예외 발생 시에도 동일한 Toast 에러 표시

### 8.3 인코딩

- **UTF-8 전용**: `FileReader.readAsText(file, 'utf-8')`
- 인코딩 깨짐 발생 시 Toast 알림: "UTF-8이 아닌 파일은 지원하지 않습니다"

### 8.4 동기화 정밀도

- **라인 단위만**: 표준 LRC 타임스탬프 (`[mm:ss.xx]`)
- Enhanced LRC (단어 단위 `<mm:ss.xx>`)는 미지원

---

## 9. ID3 Metadata Reader

### 9.1 구현 (`src/lib/id3-reader.ts`)

외부 라이브러리 없이 직접 ID3v2 바이너리를 파싱합니다.

```typescript
export async function readID3Tags(file: File): Promise<TrackMetadata | null>
```

**지원 버전:**
- ID3v2.2 (3바이트 프레임 ID: `TT2`, `TP1`, `TAL`, `PIC`)
- ID3v2.3 (4바이트 프레임 ID: `TIT2`, `TPE1`, `TALB`, `APIC`, 일반 정수 크기)
- ID3v2.4 (4바이트 프레임 ID, synchsafe 정수 크기)

**파싱 과정:**
1. 첫 10바이트에서 `ID3` 시그니처 확인
2. Synchsafe integer로 태그 전체 크기 계산
3. 프레임 순회: 텍스트 프레임 (ISO-8859-1 / UTF-16 / UTF-8) 디코딩
4. 앨범 아트: APIC/PIC 프레임 → magic bytes로 MIME 감지 → base64 data URL 생성

### 9.2 앨범 아트 처리

- `Uint8Array` → base64 변환 → `data:image/jpeg;base64,...` 또는 `data:image/png;base64,...` URL 생성
- magic bytes로 JPEG/PNG 자동 감지
- 앨범 아트 없으면 `undefined` 반환 → UI에서 기본 아이콘 표시
- 실패 시 `null` 반환 (조용히 실패)

### 9.3 메타데이터 우선순위

1. ID3 태그 (MP3 내장)
2. LRC 메타데이터 (`[ti:]`, `[ar:]`) — ID3가 없을 때 fallback
3. 파일명 — 둘 다 없을 때 fallback

---

## 10. UI / UX Design

### 10.1 디자인 톤

- **모던 미니멀**: shadcn/ui 기본 테마, 깨끗한 배경, 업계 표준 디자인
- Spotify / Apple Music 스타일 참고
- 다크 모드: OS `prefers-color-scheme` 자동 반영 (별도 토글 UI 없음)

### 10.2 데스크톱 레이아웃 (≥ 640px)

```
┌─────────────────────────────────────────────┐
│                  Dorothy                     │
├─────────────────────────────────────────────┤
│                                              │
│   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│   │  Drop MP3 / LRC here               │    │
│   │  or click to browse                 │    │
│   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │ [Album Art]  Title                   │   │
│   │   48x48      Artist                  │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │                                      │   │
│   │      ♪  이전 가사 (반투명, 작게)     │   │
│   │      ♪  이전 가사                    │   │
│   │      ▶  현재 가사 (볼드, 크게)       │   │
│   │      ♪  다음 가사                    │   │
│   │      ♪  다음 가사 (반투명, 작게)     │   │
│   │                                      │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   ━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│   01:23                            / 04:56   │
│                                              │
│          🔁      ▶⏸      ⏹      🔊━━●━━━   │
│                                              │
└─────────────────────────────────────────────┘
```

- 최대 너비 `max-w-2xl`, 중앙 정렬

### 10.3 모바일 레이아웃 (< 640px)

```
┌──────────────────────────┐
│        Dorothy           │
├──────────────────────────┤
│                          │
│  ┌────────────────────┐  │
│  │  🎵 파일 선택하기  │  │  ← 큰 버튼 (메인)
│  └────────────────────┘  │
│                          │
│  [Art] Title - Artist    │  ← 컴팩트 곡 정보
│                          │
│  ┌────────────────────┐  │
│  │ ♪ 이전 가사        │  │
│  │ ▶ 현재 가사 (강조) │  │  ← 높이 축소
│  │ ♪ 다음 가사        │  │
│  └────────────────────┘  │
│                          │
│  ━━●━━━━━━━━━━━━━━━━━━━  │
│  01:23 / 04:56           │
│                          │
│  ┌────────────────────┐  │
│  │ 🔁  ▶⏸  ⏹  🔊━●━ │  │  ← 하단 고정 컨트롤
│  └────────────────────┘  │
│                          │
└──────────────────────────┘
```

**모바일 전용 변경 사항:**
- Drag & Drop 안내 텍스트 숨김 → 큰 "파일 선택하기" 버튼으로 대체
- 하단 컨트롤 바 고정 (`sticky bottom`)
- 가사 패널 높이 축소
- 모든 터치 대상 최소 44x44px

### 10.4 반응형 브레이크포인트

| 구간 | 범위 | 특징 |
|------|------|------|
| Mobile | < 640px | 모바일 전용 레이아웃 |
| Desktop | ≥ 640px | max-w-2xl 중앙 정렬, 드래그 앤 드롭 안내 |

---

## 11. Audio Playback Flow

```
[사용자: MP3 파일 선택/드롭]
        │
        ├── URL.createObjectURL(file)
        ├── readID3Tags(file) → TrackMetadata
        │
        ▼
  audio.src = objectURL
  Zustand: loadTrack(fileName, metadata)
        │
        ▼
  audio 'loadedmetadata' → Zustand: setDuration(duration)
        │
        ▼
  [대기 상태: status = 'idle']
        │
        ▼
  [사용자: Play 클릭 또는 Space 키]
        │
        ▼
  audio.play() → Zustand: setStatus('playing')
        │
        ▼
  rAF loop 시작:
  ┌─ useRef에 currentTime 저장 (매 프레임)
  ├─ 100ms마다 Zustand setState({ currentTime })
  ├─ ProgressBar Zustand 상태 기반 리렌더
  └─ useAudioPlayer 내 이진 탐색으로 currentLineIndex 갱신
        │
        ├── [Pause 클릭 / Space] → audio.pause() → status: 'paused' → rAF 유지(정지 상태)
        ├── [Stop 클릭]          → audio.pause() + currentTime=0 → status: 'stopped'
        ├── [Seek: 드래그/클릭]  → audio.currentTime = newTime
        ├── [Seek: 가사 클릭]    → audio.currentTime = lyricLine.time
        ├── [Seek: ← →]         → audio.currentTime ± 5
        └── [ended 이벤트]
             ├── isLooping=true  → audio.currentTime=0, audio.play()
             └── isLooping=false → status: 'stopped', currentTime=0

[재생 중 새 파일 드롭]
        │
        ▼
  audio.pause() → revokeObjectURL → 새 파일 loadTrack → status: 'idle'
  (기존 LRC도 초기화)
```

---

## 12. Error Handling

### 12.1 에러 표시 방식

- **shadcn/ui Sonner (Toast)**: 화면 하단에 일시적 Toast 메시지 표시, 3~5초 후 자동 사라짐

### 12.2 에러 시나리오

| 시나리오 | Toast 메시지 | 동작 |
|----------|-------------|------|
| 지원하지 않는 파일 형식 | "MP3 또는 LRC 파일만 지원합니다" | 파일 무시 |
| MP3 로드/디코딩 실패 | "오디오 파일을 재생할 수 없습니다" | 상태 초기화 |
| LRC 파싱 실패 | "LRC 파일을 파싱할 수 없습니다" | 가사 없이 계속 |
| LRC 인코딩 깨짐 | "UTF-8이 아닌 파일은 지원하지 않습니다" | 가사 없이 계속 |
| ID3 태그 읽기 실패 | (조용히 실패) | 파일명으로 fallback |

---

## 13. Keyboard Shortcuts

| 키 | 동작 | 비고 |
|----|------|------|
| `Space` | Play / Pause 토글 | `preventDefault()`로 스크롤 방지 |
| `←` (ArrowLeft) | 5초 뒤로 Seek | `currentTime - 5`, 최솟값 0 |
| `→` (ArrowRight) | 5초 앞으로 Seek | `currentTime + 5`, 최댓값 duration |
| `↑` (ArrowUp) | 볼륨 10% 증가 | 최댓값 1.0 |
| `↓` (ArrowDown) | 볼륨 10% 감소 | 최솟값 0.0 |
| `M` / `m` | 음소거 토글 | |

- `<input>`, `<textarea>` 등에 포커스가 있을 때는 단축키 비활성화
- `document` 레벨 `keydown` 이벤트 리스너로 구현

---

## 14. Accessibility (a11y)

- shadcn/ui (Radix UI) 기본 제공 ARIA 속성 활용
- 모든 버튼에 `aria-label` 부여 ("재생", "일시정지", "정지", "음소거 토글", "반복 재생")
- Slider (Progress, Volume)에 `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- 키보드 탐색: Tab으로 컨트롤 간 이동, Enter/Space로 활성화
- 포커스 표시기(focus ring) 유지

---

## 15. File Handling Details

### 15.1 지원 파일 형식

| 형식 | MIME Type | 용도 |
|------|-----------|------|
| `.mp3` | `audio/mpeg` | 오디오 재생 |
| `.lrc` | `text/plain` | 가사 동기화 (UTF-8 전용) |

### 15.2 파일 검증

- **확장자 기반**: `.mp3` / `.lrc` 확장자로 판별
- 다른 확장자 파일 드롭 시 Toast 에러
- **파일 크기 제한 없음**: 클라이언트 전용이므로 ObjectURL로 처리, 브라우저가 메모리 관리

### 15.3 메모리 관리

- 새 MP3 로드 시 이전 ObjectURL → `URL.revokeObjectURL()` 해제
- 앨범 아트 ObjectURL도 동일하게 관리
- 컴포넌트 언마운트 시 `useEffect` cleanup에서 정리

---

## 16. Deployment (Vercel)

### 16.1 설정

```typescript
// vite.config.ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

export default defineConfig({
  server: { port: 3000 },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackStart({ srcDirectory: 'src' }),
    viteReact(),
    nitro(),
  ],
})
```

### 16.2 배포 절차

1. Git 초기화 + GitHub 리포지토리 생성
2. Vercel 프로젝트 생성 → TanStack Start 자동 감지
3. `git push` → 자동 빌드 & 배포
4. 기본 도메인 사용: `dorothy-xxxxx.vercel.app`

### 16.3 명령어

```bash
pnpm install         # 의존성 설치
pnpm run dev         # 로컬 개발 서버
pnpm run build       # 프로덕션 빌드
```

---

## 17. Dependencies

```json
{
  "dependencies": {
    "@radix-ui/react-slider": "^1.3.6",
    "@radix-ui/react-slot": "^1.2.4",
    "@tanstack/react-router": "^1.158.0",
    "@tanstack/react-start": "^1.159.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.563.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^2.0.0",
    "tailwind-merge": "^3.4.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.1.0",
    "nitro": "^3.0.1-alpha.2",
    "tailwindcss": "^4.1.0",
    "typescript": "^5.7.0",
    "vite": "^7.3.0",
    "vite-tsconfig-paths": "^6.1.0"
  }
}
```

> - shadcn/ui 컴포넌트: 수동으로 `src/components/ui/`에 생성 (Button, Slider)
> - `clsx` + `tailwind-merge`로 `cn()` 유틸리티 구현
> - `jsmediatags`, `lrc-kit`은 Vite 7 호환 문제로 제거, 직접 구현으로 대체

---

## 18. Browser Compatibility

| 브라우저 | 최소 버전 |
|----------|-----------|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 15+ |
| Edge | 90+ |

> HTML5 Audio API, File API, `URL.createObjectURL()`, `requestAnimationFrame` 모두 최신 브라우저에서 지원됩니다.

---

## 19. Testing Strategy

- **초기 버전**: 테스트 없이 빠르게 구현
- **안정화 이후**: Vitest 단위 테스트 (lrc-parser, format-time 등 유틸리티 함수부터)

---

## 20. Constraints & Limitations

- **서버 업로드 없음**: 모든 파일은 클라이언트에서만 처리
- **단일 트랙 재생**: 플레이리스트 기능은 초기 범위 밖
- **LRC 전용**: SRT, ASS 등 다른 가사 형식은 미지원
- **라인 단위 동기화만**: Enhanced LRC (단어 단위) 미지원
- **MP3 전용**: WAV, FLAC, OGG 등은 초기 범위 밖
- **UTF-8 전용**: EUC-KR, Shift_JIS 등 레거시 인코딩 미지원
- **PWA 미지원**: 오프라인/홈 화면 추가 기능 없음

---

## 21. Future Roadmap (초기 범위 밖)

아래 기능은 초기 버전에서 구현하지 않지만, 향후 확장을 고려합니다:

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 플레이리스트 | 여러 곡 등록 + 순서대로/셔플 재생 | 높음 |
| 가사 자동 검색 | 곡명/아티스트로 가사 API 검색 + 자동 로드 | 높음 |
| 오디오 시각화 | Web Audio API + AnalyserNode로 파형/스펙트럼 표시 | 중간 |
| Enhanced LRC | 단어 단위 동기화 지원 | 중간 |
| 다국어 인코딩 | 자동 인코딩 감지 (EUC-KR, Shift_JIS 등) | 낮음 |
| PWA | Service Worker, 오프라인 캐싱, 홈 화면 추가 | 낮음 |
| 추가 포맷 | WAV, FLAC, OGG, AAC 재생 지원 | 낮음 |
