/**
 * Records the Relay ~5-minute demo film to demo/relay-judge-demo.mp4
 * Prefetches Polly, injects it into the page, captures Web Audio, muxes AAC.
 *
 *   npm run dev   # in another terminal
 *   node scripts/record-demo.mjs
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, copyFile, readdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "demo");
const api = process.env.RELAY_API || "http://127.0.0.1:8787";
const web = process.env.RELAY_URL || "http://127.0.0.1:5173/?auto=1#film";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

function log(...args) {
  process.stdout.write(`${args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")}\n`);
}

async function fetchScript() {
  log("Prefetching Polly script…");
  const res = await fetch(`${api}/api/script`);
  if (!res.ok) throw new Error(`Polly script HTTP ${res.status}`);
  const data = await res.json();
  const lines = data.lines || [];
  const withAudio = lines.filter((l) => l.audio).length;
  log(`Polly lines: ${withAudio}/${lines.length} with audio`);
  return { lines };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const scriptPayload = await fetchScript();

  log("Recording", web);
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--use-fake-ui-for-media-stream",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: outDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12 * 60 * 1000);

  await page.addInitScript((payload) => {
    window.__RELAY_SCRIPT__ = payload;
    window.__relayFilmDone = false;
    window.__relayDemoAudio = null;
  }, scriptPayload);

  await page.goto("http://127.0.0.1:5173/?auto=1", { waitUntil: "networkidle" });
  await page.evaluate(() => { window.location.hash = "film"; });
  await page.waitForTimeout(1800);

  const start = page.getByRole("button", { name: /Start the 5-minute film|Begin the night|Start the film/i });
  if (await start.count()) {
    await start.first().click({ timeout: 8000 }).catch(() => {});
  }

  await page.waitForSelector(".film, .prologue, .titlecard", { timeout: 60_000 });
  log("Film running…");

  const started = Date.now();
  while (Date.now() - started < 14 * 60 * 1000) {
    const snap = await page.evaluate(() => ({
      end: Boolean(document.querySelector(".endcard")),
      approve: Boolean(document.querySelector(".btn.approve")),
      caption: document.querySelector(".caption p:last-child")?.textContent?.slice(0, 70) || "",
      done: Boolean(window.__relayFilmDone),
      phase: document.querySelector(".endcard") ? "end" : document.querySelector(".prologue") ? "prologue" : "desk",
    }));
    log("tick", snap);
    if (snap.end || snap.done) break;
    if (snap.approve) {
      log("Approving plan…");
      await page.locator(".btn.approve").first().click({ force: true, timeout: 15_000 }).catch(() => {});
    }
    await page.waitForTimeout(5000);
  }

  await page.waitForSelector(".endcard", { timeout: 5 * 60 * 1000 });
  log("End card reached — finishing audio capture…");
  await page.waitForFunction(() => window.__relayFilmDone === true, null, { timeout: 30_000 });
  await page.waitForTimeout(1200);

  const audioMeta = await page.evaluate(() => window.__relayDemoAudio);
  const video = page.video();
  await context.close();
  await browser.close();

  const webmPath = await video.path();
  log("Raw video:", webmPath);

  const mp4Path = path.join(outDir, "relay-judge-demo.mp4");
  const audioPath = path.join(outDir, "relay-demo-audio.webm");

  if (audioMeta?.b64) {
    await writeFile(audioPath, Buffer.from(audioMeta.b64, "base64"));
    log("Captured audio bytes:", Buffer.from(audioMeta.b64, "base64").length);
    // Pad audio to video length so the ~5:00 end card keeps rain under it
    await run(ffmpegPath, [
      "-y",
      "-i", webmPath,
      "-i", audioPath,
      "-filter_complex", "[1:a]apad[a]",
      "-map", "0:v:0",
      "-map", "[a]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      mp4Path,
    ]);
    await unlink(audioPath).catch(() => {});
  } else {
    log("WARNING: no captured audio — building Polly narration bed as fallback");
    const bedPath = await buildPollyBed(scriptPayload.lines, outDir);
    await run(ffmpegPath, [
      "-y",
      "-i", webmPath,
      "-i", bedPath,
      "-filter_complex", "[1:a]apad[a]",
      "-map", "0:v:0",
      "-map", "[a]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-shortest",
      "-movflags", "+faststart",
      mp4Path,
    ]);
    await unlink(bedPath).catch(() => {});
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  await copyFile(mp4Path, path.join(outDir, `relay-judge-demo-${stamp}.mp4`));
  log("Wrote", mp4Path);
  const files = await readdir(outDir);
  log("demo/", files.filter((f) => f.endsWith(".mp4")).join(", "));
}

/** Sequential Polly mp3s + soft rain bed when MediaRecorder capture fails. */
async function buildPollyBed(lines, dir) {
  const parts = [];
  let i = 0;
  for (const line of lines) {
    if (!line.audio) continue;
    const p = path.join(dir, `line-${i}.mp3`);
    await writeFile(p, Buffer.from(line.audio, "base64"));
    parts.push(p);
    i += 1;
  }
  if (!parts.length) throw new Error("No Polly audio available for fallback bed");

  const listPath = path.join(dir, "concat.txt");
  await writeFile(listPath, parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n"));
  const voicePath = path.join(dir, "polly-voice.mp3");
  await run(ffmpegPath, ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", voicePath]);

  const rainPath = path.join(dir, "rain.wav");
  await run(ffmpegPath, [
    "-y", "-f", "lavfi", "-i", "anoisesrc=color=brown:amplitude=0.04:duration=320",
    "-af", "highpass=f=400,lowpass=f=4000,volume=0.35",
    rainPath,
  ]);

  const bedPath = path.join(dir, "relay-audio-bed.m4a");
  await run(ffmpegPath, [
    "-y",
    "-i", voicePath,
    "-i", rainPath,
    "-filter_complex", "[0:a]volume=1.0[v];[1:a]volume=0.45[r];[v][r]amix=inputs=2:duration=first:dropout_transition=2",
    "-c:a", "aac", "-b:a", "192k",
    bedPath,
  ]);

  for (const p of [...parts, listPath, voicePath, rainPath]) await unlink(p).catch(() => {});
  return bedPath;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
