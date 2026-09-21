import { execFile } from "child_process";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { parseTD3MRZ } from "../src/lib/mrzScanner";

const TESSERACT_TIMEOUT_MS = 8000;
const MAX_CONCURRENCY = 4;

const execFileAsync = (file: string, args: string[]) =>
  new Promise<string>((resolve, reject) => {
    execFile(
      file,
      args,
      {
        encoding: "utf8",
        maxBuffer: 2 * 1024 * 1024,
        timeout: TESSERACT_TIMEOUT_MS,
        killSignal: "SIGKILL"
      },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(stdout);
      }
    );
  });

function cleanOcr(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9<]/g, "");
}

function numericPositionNormalize(line: string): string {
  const chars = line.split("");
  const map: Record<string, string> = {
    O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2",
    S: "5", G: "6", T: "7", B: "8"
  };
  for (const index of [9, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 42, 43]) {
    if (map[chars[index]]) chars[index] = map[chars[index]];
  }
  return chars.join("");
}

function candidateLines(raw: string): string[][] {
  const lines = raw
    .split(/\r?\n/)
    .map(cleanOcr)
    .filter(Boolean);

  const windows = new Set<string>();
  for (const line of lines) {
    if (line.length < 44) continue;
    if (line.length === 44) {
      windows.add(line);
      continue;
    }
    for (let i = 0; i + 44 <= line.length; i += 1) {
      windows.add(line.slice(i, i + 44));
    }
  }

  const first = new Set<string>();
  const second = new Set<string>();

  for (const window of windows) {
    if (window.startsWith("P<")) first.add(window);
    if (/^[A-Z0-9<]{44}$/.test(window)) second.add(window);
  }

  // Allow only the structural P< repair; field values are never synthesized.
  for (const line of lines) {
    if (line.length < 44) continue;
    for (let i = 0; i + 44 <= line.length; i += 1) {
      const window = line.slice(i, i + 44);
      if (window[0] === "P" && window[1] !== "<") {
        first.add("P<" + window.slice(2));
      }
    }
  }

  return [[...first], [...second]];
}

const ICAO_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<".split("");

function uniquelyRepairOneCharacter(
  line1: string,
  line2: string
): { line1: string; line2: string } | null {
  const solutions = new Set<string>();

  const tryLine = (line: string, lineIndex: 1 | 2) => {
    for (let position = 0; position < 44; position += 1) {
      const original = line[position];
      for (const replacement of ICAO_CHARS) {
        if (replacement === original) continue;
        const chars = line.split("");
        chars[position] = replacement;
        const candidate = chars.join("");
        const parsed = lineIndex === 1
          ? parseTD3MRZ(candidate, line2)
          : parseTD3MRZ(line1, candidate);
        if (parsed?.checksums.allValid) {
          solutions.add(
            lineIndex === 1
              ? `${candidate}|${line2}`
              : `${line1}|${candidate}`
          );
          if (solutions.size > 1) return;
        }
      }
    }
  };

  tryLine(line1, 1);
  if (solutions.size <= 1) tryLine(line2, 2);
  if (solutions.size !== 1) return null;

  const [fixedLine1, fixedLine2] = [...solutions][0].split("|");
  return { line1: fixedLine1, line2: fixedLine2 };
}

function validateCandidates(ocrText: string): { line1: string; line2: string } | null {
  const [firstRaw, secondRaw] = candidateLines(ocrText);
  const first = firstRaw.slice(0, 4);
  const second = secondRaw.slice(0, 6);

  for (const l1Raw of first) {
    const l1Variants = [
      l1Raw,
      l1Raw.replace(
        /[0-9]/g,
        (c) => ({ "0": "O", "1": "I", "2": "Z", "5": "S", "8": "B" } as Record<string, string>)[c] || c
      )
    ];

    for (const l1 of [...new Set(l1Variants)]) {
      for (const l2Raw of second) {
        const l2 = numericPositionNormalize(l2Raw);

        if (parseTD3MRZ(l1, l2)?.checksums.allValid) {
          return { line1: l1, line2: l2 };
        }
        if (parseTD3MRZ(l1, l2Raw)?.checksums.allValid) {
          return { line1: l1, line2: l2Raw };
        }

        // Expensive repair is allowed only when OCR produced exactly one
        // plausible line pair. The complete ICAO checksum gate remains mandatory.
        if (first.length === 1 && second.length === 1) {
          const repaired = uniquelyRepairOneCharacter(l1, l2);
          if (repaired) return repaired;
          const repairedRaw = uniquelyRepairOneCharacter(l1, l2Raw);
          if (repairedRaw) return repairedRaw;
        }
      }
    }
  }

  return null;
}

/**
 * Modes deliberately include left-side crops because real-world uploads are
 * often composite images: the passport occupies the left portion while other
 * people/documents occupy the right. The old implementation only cropped
 * vertically from the full frame, so it could completely miss the MRZ.
 */
async function preprocess(base64: string, mode: number): Promise<Buffer> {
  const input = Buffer.from(base64, "base64");
  const image = sharp(input).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) throw new Error("Invalid image dimensions");

  let left = 0;
  let top = 0;
  let cropWidth = width;
  let cropHeight = height;

  if (mode === 0) {
    top = Math.floor(height * 0.50);
    cropHeight = height - top;
  } else if (mode === 1) {
    top = Math.floor(height * 0.32);
    cropHeight = height - top;
  } else if (mode === 2) {
    top = Math.floor(height * 0.20);
    cropHeight = height - top;
  } else if (mode === 3) {
    left = 0;
    top = Math.floor(height * 0.32);
    cropWidth = Math.floor(width * 0.76);
    cropHeight = height - top;
  } else if (mode === 4) {
    left = 0;
    top = Math.floor(height * 0.42);
    cropWidth = Math.floor(width * 0.82);
    cropHeight = height - top;
  } else {
    left = Math.floor(width * 0.04);
    top = Math.floor(height * 0.25);
    cropWidth = Math.floor(width * 0.86);
    cropHeight = height - top;
  }

  const safeWidth = Math.max(120, Math.min(cropWidth, width - left));
  const safeHeight = Math.max(80, Math.min(cropHeight, height - top));

  const resizedWidth = Math.min(2800, Math.max(1800, safeWidth * 1.9));
  const pipeline = image
    .extract({ left, top, width: safeWidth, height: safeHeight })
    .resize({ width: Math.floor(resizedWidth), withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.15 });

  if (mode === 2 || mode === 4) {
    pipeline.threshold(175);
  }

  return pipeline.png().toBuffer();
}

type Job = { imageIndex: number; mode: number; psm: string };

async function runJob(
  dir: string,
  images: string[],
  job: Job
): Promise<{ line1: string; line2: string } | null> {
  const png = await preprocess(images[job.imageIndex], job.mode);
  const file = path.join(dir, `mrz-${job.imageIndex}-${job.mode}-${job.psm}.png`);
  await writeFile(file, png);

  const baseArgs = [
    file,
    "stdout",
    "--oem", "1",
    "-l", "eng",
    "--psm", job.psm,
    "-c", "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
    "-c", "load_system_dawg=0",
    "-c", "load_freq_dawg=0",
    "-c", "classify_enable_learning=0"
  ];

  const text = await execFileAsync("tesseract", baseArgs);
  return validateCandidates(text);
}

async function runBoundedJobs(
  dir: string,
  images: string[],
  jobs: Job[]
): Promise<{ line1: string; line2: string } | null> {
  let next = 0;
  let found: { line1: string; line2: string } | null = null;

  const worker = async () => {
    while (!found) {
      const index = next++;
      if (index >= jobs.length) return;
      try {
        const result = await runJob(dir, images, jobs[index]);
        if (result) {
          found = result;
          return;
        }
      } catch (error) {
        console.warn(
          "Native MRZ OCR attempt failed:",
          error instanceof Error ? error.message : "unknown error"
        );
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(MAX_CONCURRENCY, jobs.length) }, () => worker())
  );

  return found;
}

export async function extractVerifiedMrzWithNativeOcr(
  base64Images: string[]
): Promise<{ line1: string; line2: string } | null> {
  const images = base64Images.filter(Boolean).slice(0, 3);
  if (images.length === 0) return null;

  const dir = await mkdtemp(path.join(tmpdir(), `working-mrz-${randomUUID()}-`));

  try {
    // Phase 1: deterministic local OCR on the original upload. This is the
    // fastest path and specifically handles composite images where the passport
    // is on the left side of the frame.
    const primaryJobs: Job[] = [
      { imageIndex: 0, mode: 3, psm: "7" },
      { imageIndex: 0, mode: 4, psm: "7" },
      { imageIndex: 0, mode: 5, psm: "13" },
      { imageIndex: 0, mode: 0, psm: "7" }
    ];

    let verified = await runBoundedJobs(dir, images, primaryJobs);
    if (verified) return verified;

    // Phase 2: small fallback set. Only if Phase 1 did not produce a
    // checksum-valid MRZ do we inspect the other focused images or block OCR.
    const fallbackJobs: Job[] = [
      { imageIndex: 0, mode: 1, psm: "6" },
      { imageIndex: 0, mode: 2, psm: "6" },
      ...(images.length > 1
        ? [
            { imageIndex: 1, mode: 0, psm: "7" },
            { imageIndex: 2, mode: 0, psm: "7" }
          ]
        : [])
    ];

    verified = await runBoundedJobs(dir, images, fallbackJobs);
    return verified;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
