# Deployment Guide

이 문서는 Dorothy를 Vercel + Neon Postgres + Google OAuth로 배포하기 위한 절차를 정리합니다. 코드는 모두 준비되어 있으며, 외부 계정 작업만 차례로 수행하면 됩니다.

## 1. Neon Postgres 생성

옵션 A — Vercel Marketplace에서 (권장):
1. https://vercel.com/dashboard → 프로젝트 import (1번 단계 후로 미뤄도 됩니다)
2. Storage 탭 → Create → Neon → Database 이름 `dorothy` 정도로 생성
3. `DATABASE_URL`이 자동으로 프로젝트 환경변수에 주입됨

옵션 B — 직접 (https://neon.tech):
1. 프로젝트 생성 → 데이터베이스 `dorothy`
2. Connection string에서 **Pooled connection**을 복사 (호스트에 `-pooler` 접미사가 있는 것)
3. Vercel 프로젝트 환경변수에 `DATABASE_URL`로 추가

## 2. 스키마 푸시

로컬 `.env.local`에 `DATABASE_URL`을 채우고:

```bash
pnpm db:push          # 스키마를 직접 적용
# 또는
pnpm db:generate      # SQL 마이그레이션 생성 (이미 drizzle/0000_*.sql 존재)
```

> Neon Console > SQL Editor에서 `drizzle/0000_classy_vapor.sql` 내용을 직접 실행해도 됩니다.

## 3. Better Auth 시크릿

```bash
openssl rand -base64 32
```

출력값을 `.env.local`과 Vercel 환경변수의 `BETTER_AUTH_SECRET`에 동일하게 설정.

## 4. Google OAuth 클라이언트

1. https://console.cloud.google.com → 새 프로젝트 또는 기존 프로젝트
2. APIs & Services > OAuth consent screen 구성 (External, 앱 이름 등)
3. APIs & Services > Credentials → **Create Credentials** > **OAuth client ID**
4. Application type: **Web application**
5. Authorized JavaScript origins:
   - `http://localhost:3000` (개발)
   - `https://<your-vercel-domain>` (프로덕션 도메인 결정 후 추가)
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-vercel-domain>/api/auth/callback/google`
7. 발급된 Client ID / Client secret을 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 설정

> Vercel preview 도메인(`*-username.vercel.app`)에서도 OAuth를 쓰려면 해당 URL을 위 두 곳에 추가하고, `BETTER_AUTH_TRUSTED_ORIGINS`에 콤마 구분으로 등록.

## 5. Vercel 배포

1. https://vercel.com/new → GitHub `pollysoft-seokmin/dorothy` 선택 → Import
2. Framework Preset: **Other** (TanStack Start + Nitro Vercel preset이 자동 처리)
3. Build Command: `pnpm build` (기본값 사용 가능)
4. Output Directory: 비움 (Nitro가 `.output/`을 자동 사용)
5. Environment Variables:
   - `DATABASE_URL` (Neon이 자동 주입했으면 그대로)
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` = 프로덕션 도메인 (예: `https://dorothy.vercel.app`)
   - `BETTER_AUTH_TRUSTED_ORIGINS` (선택, preview 도메인 등)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
6. Deploy → 첫 배포 완료 후 도메인 확정 → Google Console redirect URI 업데이트 → 재배포

## 6. 배포 후 검증

1. `https://<도메인>` 접근 → 헤더 우상단 "로그인" 보이면 정상
2. `/signup`에서 이메일+비번 가입 → 메인으로 리다이렉트되며 로그인 상태 유지
3. 트랙 재생 → `/account`에서 "최근 재생"에 해당 트랙이 떠야 함
4. Google 버튼 클릭 → Google 동의 화면 → 콜백 후 로그인됨

## 환경변수 요약

| 키 | 필수 | 비고 |
|----|------|------|
| `DATABASE_URL` | O | Neon pooled connection string |
| `BETTER_AUTH_SECRET` | O | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | O | 프로덕션 도메인 (스킴 포함) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | X | preview 도메인 등 콤마 구분 |
| `GOOGLE_CLIENT_ID` | X | 없으면 Google 로그인 버튼 비활성 |
| `GOOGLE_CLIENT_SECRET` | X | Client ID와 함께 설정 필요 |

## 로컬 개발 빠른 시작

```bash
cp .env.example .env.local
# .env.local에 DATABASE_URL, BETTER_AUTH_SECRET, (선택) GOOGLE_CLIENT_ID/SECRET 채우기
pnpm install
pnpm db:push          # 스키마 적용 (한 번만)
pnpm dev              # http://localhost:3000
```
