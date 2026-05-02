import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const fixtures = path.join(import.meta.dirname, "fixtures");
const mp3Path = path.join(fixtures, "test.mp3");
const mp4Path = path.join(fixtures, "test.mp4");
const lrcPath = path.join(fixtures, "test.lrc");
const mpgLongPath = path.join(fixtures, "test-long.mpg");
const mpgMpeg2Path = path.join(fixtures, "test-mpeg2.mpg");
const mpgMpeg2Ac3Path = path.join(fixtures, "test-mpeg2-ac3.mpg");

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
      page.getByText("MP3/MP4/MPG 또는 LRC 파일을 여기에 드롭하거나 클릭하여 선택")
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

  for (const c of [
    { label: "10s MPEG-1 320x240 25fps", fixture: mpgLongPath, expected: 10 },
    { label: "15s MPEG-2 720x480 interlaced", fixture: mpgMpeg2Path, expected: 15 },
    { label: "30s MPEG-2 PAL 720x576 + AC-3", fixture: mpgMpeg2Ac3Path, expected: 30 },
  ]) {
    test(`MPG 트랜스코딩 결과 duration 정상 — ${c.label}`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(180_000);

      const ffmpegLogs: string[] = [];
      const transcodeLogs: string[] = [];
      page.on("console", (msg) => {
        const text = msg.text();
        if (text.startsWith("[ffmpeg:")) ffmpegLogs.push(text);
        else if (text.startsWith("[transcode]")) transcodeLogs.push(text);
      });

      await page.goto("/");
      await uploadFiles(page, c.fixture);

      const video = page.locator("video");
      await expect(video).toHaveCount(1, { timeout: 120_000 });
      await expect
        .poll(
          async () => video.evaluate((el: HTMLVideoElement) => el.src),
          { timeout: 120_000 }
        )
        .toMatch(/^blob:/);

      // 변환 결과 blob을 디스크로 저장 후 ffprobe로 검증
      const bytesB64 = await video.evaluate(async (el: HTMLVideoElement) => {
        const res = await fetch(el.src);
        const buf = new Uint8Array(await res.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.byteLength; i++)
          bin += String.fromCharCode(buf[i]);
        return btoa(bin);
      });
      const outBytes = Buffer.from(bytesB64, "base64");
      const outPath = path.join(
        os.tmpdir(),
        `dorothy-e2e-mpg-${Date.now()}.mp4`
      );
      fs.writeFileSync(outPath, outBytes);

      const probe = execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=duration,nb_frames,r_frame_rate,avg_frame_rate:format=duration",
          "-of",
          "json",
          outPath,
        ],
        { encoding: "utf8" }
      );
      await testInfo.attach("ffprobe.json", {
        body: probe,
        contentType: "application/json",
      });
      await testInfo.attach("ffmpeg-logs.txt", {
        body: [...transcodeLogs, ...ffmpegLogs].join("\n"),
        contentType: "text/plain",
      });
      await testInfo.attach("output.mp4", {
        path: outPath,
        contentType: "video/mp4",
      });

      const probeJson = JSON.parse(probe);
      const formatDuration = parseFloat(probeJson.format?.duration ?? "NaN");
      const streamDuration = parseFloat(probeJson.streams?.[0]?.duration ?? "NaN");
      const videoDuration = await video.evaluate((el: HTMLVideoElement) =>
        el.duration
      );

      const tolerance = 1.0;
      expect(formatDuration).toBeGreaterThan(c.expected - tolerance);
      expect(formatDuration).toBeLessThan(c.expected + tolerance);
      expect(streamDuration).toBeGreaterThan(c.expected - tolerance);
      expect(streamDuration).toBeLessThan(c.expected + tolerance);
      expect(Number.isFinite(videoDuration)).toBe(true);
      expect(videoDuration).toBeGreaterThan(c.expected - tolerance);
      expect(videoDuration).toBeLessThan(c.expected + tolerance);
    });
  }

  // 회귀: audio↔video 엘리먼트가 교체될 때 미디어 이벤트 리스너가 새 엘리먼트로
  // 옮겨지지 않아 setDuration이 호출되지 않던 버그(UI에 "00:00" 표시) 방지.
  test("MPG 업로드 후 UI 시간 표시가 0이 아닌 정상 duration", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    await uploadFiles(page, mpgMpeg2Ac3Path);

    const video = page.locator("video");
    await expect(video).toHaveCount(1, { timeout: 120_000 });
    await expect
      .poll(
        async () =>
          video.evaluate((el: HTMLVideoElement) =>
            Number.isFinite(el.duration) && el.duration > 0 ? el.duration : 0,
          ),
        { timeout: 60_000 },
      )
      .toBeGreaterThan(25);

    // UI에 표시되는 "/ MM:SS" 텍스트가 00:00이 아닌 실제 duration이어야 한다.
    const durationLocator = page.locator("text=/\\/ \\d{2}:\\d{2}/").first();
    await expect(durationLocator).not.toHaveText("/ 00:00", { timeout: 10_000 });
    const durationText = await durationLocator.textContent();
    expect(durationText).toMatch(/\/ 00:(2[5-9]|3[0-5])/);
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
