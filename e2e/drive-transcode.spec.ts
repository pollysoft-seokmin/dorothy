import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// TanStack Start 의 서버 fn 응답은 seroval crossJSON 으로 직렬화되고 클라이언트가
// fromCrossJSON 으로 역직렬화한다(평문 JSON 은 사용되지 않음). 모킹 응답도 동일
// 포맷 + x-tss-serialized 헤더로 내보내야 클라이언트가 값을 인식한다.
let toCrossJSON: ((v: unknown) => unknown) | undefined
async function loadSeroval() {
  if (toCrossJSON) return
  const pnpm = path.join(import.meta.dirname, '..', 'node_modules', '.pnpm')
  const dir = fs.readdirSync(pnpm).find((d) => d.startsWith('seroval@'))
  if (!dir) throw new Error('seroval package not found under .pnpm')
  const mod = await import(
    path.join(pnpm, dir, 'node_modules/seroval/dist/esm/production/index.mjs')
  )
  toCrossJSON = mod.toCrossJSON
}

// Google Drive 재생 경로(loadUrl)의 신규 동작 검증:
//  - 비호환 비디오(.mpg) 선택 시 변환 진행 UI(디밍 + "변환 중" + %) 표시
//  - 변환 완료 후 일반 재생 상태(blob src + duration>0)로 전환
//  - 같은 파일 재생 시 IndexedDB 캐시 재활용(변환 UI 없이 즉시 재생)
//
// 실제 Google OAuth 는 자동화 불가하므로, 세션/Drive 서버 fn/프록시를 모킹해
// 인증 이후 레이어만 검증한다. ffmpeg.wasm 코어는 기존 트랜스코딩 테스트와
// 동일하게 CDN 에서 로드된다(네트워크 필요).

const fixtures = path.join(import.meta.dirname, 'fixtures')
const mpgBytes = fs.readFileSync(path.join(fixtures, 'test-long.mpg'))

const ASSET = {
  id: 'drive-vid-1',
  name: 'sample.mpg',
  mediaType: 'video',
  mimeType: 'video/mpeg',
  sizeBytes: mpgBytes.byteLength,
  modifiedTime: null,
}

// /_serverFn/<base64url({file,export})> → export 이름으로 응답을 고른다.
function decodeServerFnExport(url: string): string {
  const m = url.match(/\/_serverFn\/([^/?]+)/)
  if (!m) return ''
  try {
    const json = Buffer.from(m[1], 'base64url').toString('utf8')
    return JSON.parse(json).export ?? ''
  } catch {
    return ''
  }
}

async function installMocks(page: import('@playwright/test').Page) {
  await loadSeroval()
  // 서버 fn 반환값은 { result } 봉투로 감싸 seroval crossJSON + x-tss-serialized
  // 로 직렬화해 응답한다(클라이언트가 result.result 를 추출).
  const serverFnJson = (route: import('@playwright/test').Route, value: unknown) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json', 'x-tss-serialized': 'true' },
      body: JSON.stringify(toCrossJSON!({ result: value })),
    })

  // 1) better-auth 세션 → 로그인 상태
  await page.route('**/api/auth/**', (route) => {
    const u = route.request().url()
    if (u.includes('session')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user', email: 't@e.st', name: 'Tester', emailVerified: true },
          session: {
            id: 's1',
            userId: 'test-user',
            expiresAt: new Date(Date.now() + 3600e3).toISOString(),
          },
        }),
      })
    }
    return route.continue()
  })

  // 2) Drive 서버 fn — 평문 application/json(X-TSS-Serialized 미설정)이면
  //    클라이언트가 반환값을 그대로 사용한다.
  await page.route('**/_serverFn/**', (route) => {
    const exp = decodeServerFnExport(route.request().url())
    const json = (v: unknown) => serverFnJson(route, v)
    if (exp.includes('getGoogleDriveStatus')) {
      return json({ connected: true, hasDriveScope: true })
    }
    if (exp.includes('listGoogleDriveContents')) {
      return json({
        folders: [],
        assets: [ASSET],
        totalCount: 1,
        unsupportedCount: 0,
        nextPageToken: null,
      })
    }
    if (exp.includes('getFavorites')) return json([])
    if (exp.includes('getMyPreferences')) return json({})
    // 그 외(최근재생 기록 등)는 빈 응답
    return json(null)
  })

  // 3) Drive 프록시 → .mpg 픽스처 바이트
  let proxyHits = 0
  await page.route('**/api/google-drive/file**', (route) => {
    proxyHits++
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'video/mpeg', 'content-length': String(mpgBytes.byteLength) },
      body: mpgBytes,
    })
  })
  return { proxyHits: () => proxyHits }
}

async function openLibraryAndPlay(page: import('@playwright/test').Page) {
  // 데스크톱 라이브러리는 기본 열림. 재생 시 닫히므로, 닫혀 있으면(행이 화면
  // 밖으로 translate) 토글로 다시 연 뒤 클릭한다. 모바일 시트(off-screen)와
  // 행이 중복되므로 클릭 대상은 데스크톱 aside 안으로 한정한다.
  const row = page.locator('aside').getByText('sample.mpg', { exact: false }).first()
  await expect(row).toBeVisible({ timeout: 15_000 })
  const box = await row.boundingBox()
  if (!box || box.x < 0) {
    await page.getByRole('button', { name: '내 미디어 패널 토글' }).click()
    await expect
      .poll(async () => (await row.boundingBox())?.x ?? -1, { timeout: 5_000 })
      .toBeGreaterThanOrEqual(0)
  }
  await row.click()
}

test('Drive 비호환 비디오: 변환 진행 UI → 재생 → 캐시 재활용', async ({ page }) => {
  test.setTimeout(180_000)
  const mocks = await installMocks(page)

  await page.goto('/')
  await expect(page.getByRole('button', { name: '내 미디어' }).first()).toBeVisible({
    timeout: 15_000,
  })

  // --- 1차 재생: 변환 경로 ---
  await openLibraryAndPlay(page)

  const video = page.locator('video')
  await expect(video).toHaveCount(1, { timeout: 15_000 })

  // 변환 진행 UI: 디밍 오버레이 + "변환 중" 라벨 + % 표시
  await expect(page.getByText('재생 가능한 형식으로 변환 중')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('변환 중', { exact: true })).toBeVisible()
  // 현재 시간 표시 위치(좌측)에 N% 가 노출
  await expect(page.getByText(/^\d{1,3}%$/)).toBeVisible()

  // 변환 완료 → 일반 재생 상태: 오버레이 사라지고 blob src + duration>0
  await expect(page.getByText('재생 가능한 형식으로 변환 중')).toHaveCount(0, { timeout: 150_000 })
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.src), { timeout: 10_000 })
    .toMatch(/^blob:/)
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.duration), { timeout: 20_000 })
    .toBeGreaterThan(0)

  // 일원화 검증: 비호환 경로는 실제 파일을 한 번만 받아 가사+변환에 함께 쓰므로
  // 프록시 호출은 다운로드 1회뿐(가사용 별도 URL fetch 없음).
  expect(mocks.proxyHits()).toBe(1)

  const firstSrc = await video.evaluate((el: HTMLVideoElement) => el.src)

  // --- 2차 재생: 같은 파일 → IndexedDB 캐시 재활용(변환 UI 없이 즉시) ---
  await openLibraryAndPlay(page)

  // 새 blob src 가 적용되며(캐시본), 변환 오버레이는 나타나지 않아야 한다.
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.src), { timeout: 15_000 })
    .not.toBe(firstSrc)
  await expect(page.getByText('재생 가능한 형식으로 변환 중')).toHaveCount(0)
  await expect
    .poll(async () => video.evaluate((el: HTMLVideoElement) => el.duration), { timeout: 20_000 })
    .toBeGreaterThan(0)
})
