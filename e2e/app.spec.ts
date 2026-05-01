import { test, expect } from "@playwright/test";
import path from "node:path";

const fixtures = path.join(import.meta.dirname, "fixtures");
const mp3Path = path.join(fixtures, "test.mp3");
const mp4Path = path.join(fixtures, "test.mp4");
const lrcPath = path.join(fixtures, "test.lrc");

async function uploadFiles(
  page: import("@playwright/test").Page,
  files: string | string[]
) {
  const fileInput = page.locator('input[type="file"][multiple]');
  await fileInput.setInputFiles(files);
  // React doesn't handle the CDP-dispatched change event from setInputFiles.
  // A brief wait is needed before re-dispatching so React can process it.
  // 병렬 실행 시 dev server 부하로 더 넉넉하게 대기.
  await page.waitForTimeout(1500);
  await fileInput.evaluate((el) => {
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

test.describe("Dorothy", () => {
  test("페이지 로드 시 기본 UI 표시", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Dorothy" })).toBeVisible();
    await expect(
      page.getByText("MP3/MP4 또는 LRC 파일을 여기에 드롭하거나 클릭하여 선택")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "재생", exact: true })
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "정지" })
    ).toBeDisabled();
  });

  test("MP3 파일 업로드 시 트랙 정보 표시 및 버튼 활성화", async ({
    page,
  }) => {
    await page.goto("/");

    await uploadFiles(page, mp3Path);

    // FileDropZone에 파일명 표시 (desktop + mobile 두 곳에 표시되므로 first)
    await expect(page.getByText("test.mp3").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "재생", exact: true })
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "정지" })
    ).toBeEnabled();
  });

  test("MP3 + LRC 업로드 시 가사 라인 렌더링", async ({ page }) => {
    await page.goto("/");

    // MP3 먼저 업로드 후, LRC 업로드 (loadTrack이 lyrics를 초기화하므로 순차 업로드)
    await uploadFiles(page, mp3Path);
    await expect(page.getByText("test.mp3").first()).toBeVisible();

    await uploadFiles(page, lrcPath);

    await expect(page.getByText("첫 번째 가사 라인")).toBeVisible();
    await expect(page.getByText("두 번째 가사 라인")).toBeVisible();
    await expect(page.getByText("세 번째 가사 라인")).toBeVisible();
    await expect(page.getByText("네 번째 가사 라인")).toBeVisible();
    await expect(page.getByText("다섯 번째 가사 라인")).toBeVisible();
  });

  test("LRC 미로드 시 플레이스홀더 텍스트 표시", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText("LRC 파일을 추가하면 가사가 표시됩니다")
    ).toBeVisible();
  });

  test("MP4 파일 업로드 시 video 엘리먼트 노출 및 버튼 활성화", async ({
    page,
  }) => {
    await page.goto("/");

    // 초기 상태: video 엘리먼트 없음
    await expect(page.locator("video")).toHaveCount(0);

    await uploadFiles(page, mp4Path);

    // video 엘리먼트가 마운트되고 src가 적용됨
    const video = page.locator("video");
    await expect(video).toHaveCount(1);
    await expect
      .poll(async () => video.evaluate((el: HTMLVideoElement) => el.src))
      .toMatch(/^blob:/);

    await expect(page.getByText("test.mp4").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "재생", exact: true })
    ).toBeEnabled();
  });

  test("MP4 + LRC 업로드 시 가사 라인 렌더링", async ({ page }) => {
    await page.goto("/");

    await uploadFiles(page, mp4Path);
    await expect(page.locator("video")).toHaveCount(1);

    await uploadFiles(page, lrcPath);

    await expect(page.getByText("첫 번째 가사 라인")).toBeVisible();
    await expect(page.getByText("다섯 번째 가사 라인")).toBeVisible();
  });

  test("MP3 → MP4 전환 시 audio가 video로 교체", async ({ page }) => {
    await page.goto("/");

    await uploadFiles(page, mp3Path);
    await expect(page.locator("audio")).toHaveCount(1);
    await expect(page.locator("video")).toHaveCount(0);

    await uploadFiles(page, mp4Path);
    await expect(page.locator("video")).toHaveCount(1);
    await expect(page.locator("audio")).toHaveCount(0);
  });
});
