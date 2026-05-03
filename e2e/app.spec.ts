import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { blowfishEncryptECB } from "../src/lib/blowfish";

const fixtures = path.join(import.meta.dirname, "fixtures");
const mp3Path = path.join(fixtures, "test.mp3");
const mp4Path = path.join(fixtures, "test.mp4");
const lrcPath = path.join(fixtures, "test.lrc");
const mpgLongPath = path.join(fixtures, "test-long.mpg");
const mpgMpeg2Path = path.join(fixtures, "test-mpeg2.mpg");
const mpgMpeg2Ac3Path = path.join(fixtures, "test-mpeg2-ac3.mpg");
const mpeg4Part2Path = path.join(fixtures, "test-mpeg4-part2.mp4");
const xvidAviPath = path.join(fixtures, "test-xvid.avi");

// Polly-format SAMI trailer = ciphertext || u64 LE length || 10B ASCII tag.
// Korean language directives in the SAMI body must be emitted as EUC-KR bytes.
// `truncateBytes` lets a test simulate the real-world polly writer quirk:
// the cipher is written to disk truncated by N bytes, and dataSize is
// stored as the unpadded plaintext length (not a multiple of 8). The reader
// rounds up to recover the full cipher size, stealing N bytes from the
// scriptLength field for the last block.
function buildSamiTrailerMp3(
  samplePath: string,
  outPath: string,
  truncateBytes = 0,
  duplicateEnKo = false,
): void {
  const ascii = (s: string) => new TextEncoder().encode(s);
  const concat = (...parts: Uint8Array[]) => {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const p of parts) {
      out.set(p, off);
      off += p.length;
    }
    return out;
  };
  // 영어 자막 / 한글 자막 in EUC-KR
  const EN_TAG = concat(
    ascii("<!-- "),
    new Uint8Array([0xbf, 0xb5, 0xbe, 0xee, 0x20, 0xc0, 0xda, 0xb8, 0xb7]),
    ascii(" -->\n"),
  );
  const KO_TAG = concat(
    ascii("<!-- "),
    new Uint8Array([0xc7, 0xd1, 0xb1, 0xdb, 0x20, 0xc0, 0xda, 0xb8, 0xb7]),
    ascii(" -->\n"),
  );
  const enFirst = duplicateEnKo ? "SAMI shared one" : "SAMI hello en";
  const enSecond = duplicateEnKo ? "SAMI shared two" : "SAMI second en";
  const koFirst = duplicateEnKo ? "SAMI shared one" : "SAMI hello ko";
  const koSecond = duplicateEnKo ? "SAMI shared two" : "SAMI second ko";
  const samiBytes = concat(
    ascii("<SAMI>\n<HEAD>\n<TITLE>SamiTest</TITLE>\n</HEAD>\n<BODY>\n"),
    EN_TAG,
    ascii(`<SYNC Start=500>\n<P Class=ENCC>${enFirst}\n`),
    ascii("<SYNC Start=2000>&nbsp;\n"),
    ascii(`<SYNC Start=2500>\n<P Class=ENCC>${enSecond}\n`),
    ascii("<SYNC Start=4000>&nbsp;\n"),
    KO_TAG,
    ascii(`<SYNC Start=500>\n<P Class=KRCC>${koFirst}\n`),
    ascii("<SYNC Start=2000>&nbsp;\n"),
    ascii(`<SYNC Start=2500>\n<P Class=KRCC>${koSecond}\n`),
    ascii("<SYNC Start=4000>&nbsp;\n"),
    ascii("</BODY>\n</SAMI>\n"),
  );
  // Pad to 8-byte boundary with spaces (encryption requires alignment).
  const plainLen = samiBytes.length;
  const pad = (8 - (plainLen % 8)) % 8;
  const padded = new Uint8Array(plainLen + pad);
  padded.set(samiBytes, 0);
  for (let i = plainLen; i < padded.length; i++) padded[i] = 0x20;
  const cipher = blowfishEncryptECB(ascii("singlepc"), padded);
  // Real polly writers store fewer cipher bytes than they actually produced
  // (paddedLen) and record dataSize = paddedLen - truncateBytes. The reader
  // rounds up to recover paddedLen, with the trailing N bytes stolen from
  // the scriptLength field — last 8-byte block decrypts to garbage that the
  // SAMI parser ignores (it breaks on </SAMI>).
  const truncatedCipher =
    truncateBytes > 0 ? cipher.subarray(0, cipher.length - truncateBytes) : cipher;
  const dataSize = truncatedCipher.length;
  const lenBytes = new Uint8Array(8);
  new DataView(lenBytes.buffer).setUint32(0, dataSize, true);
  const tag = ascii("singlepubl");

  const original = fs.readFileSync(samplePath);
  const trailer = concat(truncatedCipher, lenBytes, tag);
  fs.writeFileSync(outPath, Buffer.concat([original, Buffer.from(trailer)]));
}

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
      page.getByText("오디오/비디오 또는 LRC 파일을 여기에 드롭하거나 클릭하여 선택")
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

    // UI duration 표시가 00:00이 아닌 실제 duration이어야 한다.
    // TimeDisplay 행의 두 번째 span이 duration.
    const durationLocator = page
      .locator("div.tabular-nums")
      .locator("span")
      .last();
    await expect(durationLocator).not.toHaveText("00:00", { timeout: 10_000 });
    const durationText = await durationLocator.textContent();
    expect(durationText).toMatch(/^00:(2[5-9]|3[0-5])$/);
  });

  // "첫 프레임에서 멈춤" 증상 재현/회귀 검증.
  // 두 가지 신호를 동시에 본다:
  //  1) requestVideoFrameCallback: 컴포지터에 실제로 표시된 프레임 수
  //  2) canvas 픽셀 해시: 시점별 비디오 픽셀이 실제로 변하는지
  test("MPG 업로드 후 비디오가 실제로 렌더링되며 프레임이 진행", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    await page.goto("/");
    const adhocFixture = process.env.E2E_RENDER_FIXTURE;
    await uploadFiles(page, adhocFixture ?? mpgMpeg2Ac3Path);

    const video = page.locator("video");
    await expect(video).toHaveCount(1, { timeout: 120_000 });
    await expect
      .poll(
        async () => video.evaluate((el: HTMLVideoElement) => el.readyState),
        { timeout: 120_000 },
      )
      .toBeGreaterThanOrEqual(2); // HAVE_CURRENT_DATA 이상

    type Sample = { t: number; ct: number; presented: number; pixelHash: string };

    // 페이지 컨텍스트에서 재생 + 측정. 비디오를 약 3초 재생하면서:
    //  - rVFC로 표시된 프레임 수 카운트
    //  - 0.0s, 0.5s, 1.0s, 2.0s, 3.0s 시점에 canvas로 readback해 픽셀 해시 기록
    const result = await video.evaluate(async (el: HTMLVideoElement) => {
      const v = el as HTMLVideoElement & {
        requestVideoFrameCallback?: (
          cb: (now: number, metadata: { presentedFrames: number }) => void,
        ) => number;
        getVideoPlaybackQuality?: () => {
          totalVideoFrames: number;
          droppedVideoFrames: number;
        };
      };

      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 48;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const hashFrame = (): string => {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        // 빠른 비교용 32-bit FNV-1a
        let h = 0x811c9dc5;
        for (let i = 0; i < data.length; i += 17) {
          h ^= data[i];
          h = Math.imul(h, 0x01000193);
        }
        return (h >>> 0).toString(16);
      };

      let presented = 0;
      const tickFrame = (
        _now: number,
        meta: { presentedFrames: number },
      ) => {
        presented = meta.presentedFrames;
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tickFrame);
      };
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(tickFrame);

      const samples: Sample[] = [];
      const sampleAt = (label: number) => {
        samples.push({
          t: performance.now(),
          ct: v.currentTime,
          presented,
          pixelHash: hashFrame(),
        });
        return label;
      };

      v.muted = true; // autoplay 정책 회피
      sampleAt(0);
      try {
        await v.play();
      } catch (e) {
        return {
          error: `play() rejected: ${(e as Error).message}`,
          samples,
          quality: v.getVideoPlaybackQuality?.() ?? null,
        };
      }

      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
      await wait(500);
      sampleAt(0.5);
      await wait(500);
      sampleAt(1.0);
      await wait(1000);
      sampleAt(2.0);
      await wait(1000);
      sampleAt(3.0);

      v.pause();

      return {
        error: null,
        samples,
        quality: v.getVideoPlaybackQuality?.() ?? null,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        rect: v.getBoundingClientRect(),
      };
    });

    await testInfo.attach("playback-trace.json", {
      body: JSON.stringify(result, null, 2),
      contentType: "application/json",
    });

    // 비디오 엘리먼트 영역만 잘라낸 스크린샷도 첨부 (시각 확인용)
    const png = await video.screenshot();
    await testInfo.attach("video-region.png", {
      body: png,
      contentType: "image/png",
    });

    expect(result.error).toBeNull();
    expect(result.videoWidth).toBeGreaterThan(0);
    expect(result.videoHeight).toBeGreaterThan(0);

    const samples = result.samples;
    const last = samples[samples.length - 1];
    const first = samples[0];

    // 1) currentTime이 진행했어야 함
    expect(last.ct).toBeGreaterThan(first.ct + 1.0);

    // 2) 컴포지터에 표시된 프레임 수가 충분히 증가했어야 함 (3초 재생 → 25fps 입력 기준 75 frames 근처)
    expect(last.presented).toBeGreaterThan(first.presented + 30);

    // 3) 픽셀 해시가 시점별로 한 번 이상 변해야 함 (= 첫 프레임 stuck 아님)
    const distinctHashes = new Set(samples.map((s) => s.pixelHash));
    expect(distinctHashes.size).toBeGreaterThan(1);
  });

  // 회귀: 컨테이너는 mp4지만 안의 코덱이 브라우저 비호환(MPEG-4 Part 2)인
  // 파일과, 컨테이너 자체가 비호환(.avi 등)인 파일도 업로드 시 자동
  // 트랜스코딩되어 정상 렌더링되어야 한다.
  for (const c of [
    { label: "mp4(MPEG-4 Part 2 codec)", fixture: mpeg4Part2Path },
    { label: "avi(Xvid)", fixture: xvidAviPath },
  ]) {
    test(`브라우저 비호환 비디오 자동 변환 — ${c.label}`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.goto("/");
      await uploadFiles(page, c.fixture);

      const video = page.locator("video");
      await expect(video).toHaveCount(1, { timeout: 120_000 });
      // 트랜스코딩 완료까지 대기 (videoWidth>0 + readyState>=2)
      await expect
        .poll(
          async () =>
            video.evaluate((el: HTMLVideoElement) => el.videoWidth),
          { timeout: 60_000 },
        )
        .toBeGreaterThan(0);

      const dim = await video.evaluate((el: HTMLVideoElement) => ({
        videoWidth: el.videoWidth,
        videoHeight: el.videoHeight,
        readyState: el.readyState,
      }));
      expect(dim.videoWidth).toBeGreaterThan(0);
      expect(dim.videoHeight).toBeGreaterThan(0);
      expect(dim.readyState).toBeGreaterThanOrEqual(2);

      // 짧게 재생해 컴포지터에 프레임이 진행하는지 확인
      const result = await video.evaluate(async (el: HTMLVideoElement) => {
        const v = el as HTMLVideoElement & {
          requestVideoFrameCallback?: (
            cb: (now: number, m: { presentedFrames: number }) => void,
          ) => number;
        };
        let presented = 0;
        const tick = (_: number, m: { presentedFrames: number }) => {
          presented = m.presentedFrames;
          v.requestVideoFrameCallback?.(tick);
        };
        v.requestVideoFrameCallback?.(tick);
        v.muted = true;
        try {
          await v.play();
        } catch {
          /* ignore autoplay rejection */
        }
        const startCt = v.currentTime;
        const startPresented = presented;
        await new Promise((r) => setTimeout(r, 1500));
        v.pause();
        return {
          ctDelta: v.currentTime - startCt,
          presentedDelta: presented - startPresented,
        };
      });
      expect(result.ctDelta).toBeGreaterThan(0.5);
      expect(result.presentedDelta).toBeGreaterThan(10);
    });
  }

  test("MP3 → MP4 전환 시 audio가 video로 교체", async ({ page }) => {
    await page.goto("/");

    await uploadFiles(page, mp3Path);
    await expect(page.locator("audio")).toHaveCount(1);
    await expect(page.locator("video")).toHaveCount(0);

    await uploadFiles(page, mp4Path);
    await expect(page.locator("video")).toHaveCount(1);
    await expect(page.locator("audio")).toHaveCount(0);
  });

  test("Polly-format SAMI 트레일러가 임베디드된 MP3 업로드 시 자막 자동 로드", async ({
    page,
  }) => {
    const tmpFile = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), "dorothy-sami-")),
      "sami.mp3",
    );
    buildSamiTrailerMp3(mp3Path, tmpFile);

    await page.goto("/");
    await uploadFiles(page, tmpFile);

    // 외부 LRC 없이도 EN+KO 라인이 동시에 렌더되어야 한다.
    await expect(page.getByText("SAMI hello en")).toBeVisible();
    await expect(page.getByText("SAMI hello ko")).toBeVisible();
    await expect(page.getByText("SAMI second en")).toBeVisible();
    await expect(page.getByText("SAMI second ko")).toBeVisible();
  });

  test("EN/KO 본문이 동일한 SAMI는 한 번만 표시", async ({ page }) => {
    // 일부 콘텐츠는 EN 섹션과 KO 섹션에 동일한 한국어 번역을 그대로
    // 복제해 두는 경우가 있다 — 두 줄로 표시하면 중복이라 한 줄만 노출.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dorothy-sami-dup-"));
    const tmpFile = path.join(dir, "sami.mp3");
    buildSamiTrailerMp3(mp3Path, tmpFile, 0, true);

    await page.goto("/");
    await uploadFiles(page, tmpFile);

    await expect(page.getByText("SAMI shared one")).toHaveCount(1);
    await expect(page.getByText("SAMI shared two")).toHaveCount(1);
  });

  test("dataSize가 8의 배수가 아닌 SAMI 트레일러도 자막 로드", async ({
    page,
  }) => {
    // 실제 polly 출력 파일들은 cipher가 disk에서 잘린 채(예: -2바이트)로
    // 저장되고, dataSize 필드에는 그 절단된 길이(8 미배수)가 기록되어 있다.
    // 리더는 ceil(dataSize/8)*8 만큼 읽어 마지막 블록의 일부 바이트를
    // 다음 필드에서 빌려와 복호화한다 — 이 경로 회귀 방지.
    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "dorothy-sami-unaligned-"),
    );
    const tmpFile = path.join(dir, "sami.mp3");
    buildSamiTrailerMp3(mp3Path, tmpFile, 2); // truncate cipher by 2 bytes

    await page.goto("/");
    await uploadFiles(page, tmpFile);

    await expect(page.getByText("SAMI hello en")).toBeVisible();
    await expect(page.getByText("SAMI second ko")).toBeVisible();
  });
});
