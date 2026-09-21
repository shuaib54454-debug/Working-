import { execFile } from "child_process";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { parseTD3MRZ } from "../src/lib/mrzScanner";

const execFileAsync = (file: string, args: string[]) => new Promise<string>((resolve, reject) => {
  execFile(file, args, { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 }, (error, stdout) => {
    if (error) reject(error);
    else resolve(stdout);
  });
});

function cleanOcr(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9<]/g, "");
}

function numericPositionNormalize(line: string): string {
  const chars = line.split("");
  const map: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", G: "6", T: "7", B: "8" };
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
    // OCR may merge the two MRZ lines or add leading/trailing garbage.
    // Search every 44-character window instead of assuming a line break.
    for (let i = 0; i + 44 <= line.length; i += 1) {
      windows.add(line.slice(i, i + 44));
    }
  }

  const first = new Set<string>();
  const second = new Set<string>();

  for (const window of windows) {
    const p = window.indexOf("P<");
    if (p === 0) first.add(window);
    // Some OCR engines preserve the 44-char line but lose the line break.
    if (/^[A-Z0-9<]{44}$/.test(window)) second.add(window);
  }

  // If the first line's structural "P<" marker was misread, allow a single
  // structural correction at position 2 only. No field values are synthesized.
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

function uniquelyRepairOneCharacter(line1: string, line2: string): { line1: string; line2: string } | null {
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
          solutions.add(lineIndex === 1 ? `${candidate}|${line2}` : `${line1}|${candidate}`);
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
  // Bound candidate work. OCR output from a full passport can contain many
  // 44-character windows; exhaustive repair across all of them can become
  // quadratic and was a major source of request timeouts.
  const first = firstRaw.slice(0, 4);
  const second = secondRaw.slice(0, 6);
  for (const l1Raw of first) {
    const l1Variants = [
      l1Raw,
      l1Raw.replace(/[0-9]/g, (c) => ({ "0": "O", "1": "I", "2": "Z", "5": "S", "8": "B" } as Record<string, string>)[c] || c)
    ];
    for (const l1 of [...new Set(l1Variants)]) {
      for (const l2Raw of second) {
        const l2 = numericPositionNormalize(l2Raw);
        const parsed = parseTD3MRZ(l1, l2);
        if (parsed?.checksums.allValid) return { line1: l1, line2: l2 };
        const parsedRaw = parseTD3MRZ(l1, l2Raw);
        if (parsedRaw?.checksums.allValid) return { line1: l1, line2: l2Raw };

        // Last-resort OCR correction is intentionally bounded to the most
        // plausible candidate pair. The complete ICAO checksum gate remains
        // mandatory; no synthetic MRZ is accepted.
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

async function preprocess(base64: string, mode: number): Promise<Buffer> {
  const input = Buffer.from(base64, "base64");
  const image = sharp(input).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  if (!width || !height) throw new Error("Invalid image dimensions");

  const top = Math.floor(height * (mode === 0 ? 0.50 : mode === 1 ? 0.32 : 0.20));
  const crop = image.extract({ left: 0, top, width, height: height - top });
  const pipeline = mode === 2
    ? crop.resize({ width: Math.min(3000, Math.max(1800, width * 1.8)) }).grayscale().normalize().sharpen({ sigma: 1.2 }).threshold(175)
    : crop.resize({ width: Math.min(3000, Math.max(1800, width * 1.8)) }).grayscale().normalize().sharpen({ sigma: 1.1 });
  return pipeline.png().toBuffer();
}

export async function extractVerifiedMrzWithNativeOcr(base64Images: string[]): Promise<{ line1: string; line2: string } | null> {
  const dir = await mkdtemp(path.join(tmpdir(), `working-mrz-${randomUUID()}-`));
  try {
    // Keep the native path bounded. Tesseract is the deterministic verifier,
    // but running dozens of full-page OCR processes on Render can exceed the
    // browser request timeout. Use the original image plus at most two focused
    // crops, with two high-value preprocessing modes and line/block segmentation.
    const images = base64Images.slice(0, 3);
    const jobs: Array<{ imageIndex: number; mode: number; psm: string }> = [];
    for (let imageIndex = 0; imageIndex < images.length; imageIndex += 1) {
      for (const mode of [0, 2]) {
        for (const psm of ["6", "7"]) jobs.push({ imageIndex, mode, psm });
      }
    }

    for (const job of jobs) {
      try {
        const png = await preprocess(images[job.imageIndex], job.mode);
        const file = path.join(dir, `mrz-${job.imageIndex}-${job.mode}-${job.psm}.png`);
        await writeFile(file, png);
        const baseArgs = [
          file, "stdout", "--oem", "1", "-l", "eng",
          "-c", "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
          "-c", "load_system_dawg=0",
          "-c", "load_freq_dawg=0",
          "-c", "classify_enable_learning=0"
        ];
        const text = await execFileAsync("tesseract", [...baseArgs, "--psm", job.psm]);
        const verified = validateCandidates(text);
        if (verified) return verified;
      } catch (error) {
        console.warn("Native MRZ OCR attempt failed:", error instanceof Error ? error.message : "unknown error");
      }
    }
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
