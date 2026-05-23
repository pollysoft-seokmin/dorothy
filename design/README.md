# Design bundles

Claude Design (claude.ai/design) 에서 export 된 디자인 핸드오프 번들을 보관한다.
새 번들이 들어오면 같은 위치에 덮어쓰거나(주제 단위로 같은 줄기) 별도 폴더로 추가한다.

## 구조

- `dorothy/` — 최신 번들
  - `README.md` — 코딩 에이전트용 안내
  - `chats/` — 디자인 채팅 트랜스크립트
  - `project/` — HTML/JSX 프로토타입 + 디자인 토큰

## 사용 흐름

새 디자인 변경이 들어오면:
1. 트랜스크립트(`chats/*.md`)에서 의도 파악
2. `project/Spotify Design Proposal.html` 의 import 트리를 따라가며 관련 jsx 읽기
3. 변경 범위 좁혀 GitHub 이슈 생성 → 브랜치 → PR 흐름
