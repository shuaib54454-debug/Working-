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

function validateCandidates(ocrText: string): { line1: string; line2: string } | null {
  const [first, second] = candidateLines(ocrText);
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

  const top = Math.floor(height * (mode === 0 ? 0.55 : mode === 1 ? 0.42 : 0.30));
  const crop = image.extract({ left: 0, top, width, height: height - top });
  const pipeline = mode === 2
    ? crop.resize({ width: Math.min(3600, Math.max(2200, width * 2)) }).grayscale().normalize().sharpen({ sigma: 1.4 }).threshold(170)
    : crop.resize({ width: Math.min(3600, Math.max(2400, width * 2.2)) }).grayscale().normalize().sharpen({ sigma: 1.2 });
  return pipeline.png().toBuffer();
}

export async function extractVerifiedMrzWithNativeOcr(base64Images: string[]): Promise<{ line1: string; line2: string } | null> {
  const dir = await mkdtemp(path.join(tmpdir(), `working-mrz-${randomUUID()}-`));
  try {
    const images = base64Images.slice(0, 10);
    for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
      for (let mode = 0; mode < 3; mode++) {
        try {
          const png = await preprocess(images[imageIndex], mode);
          const file = path.join(dir, `mrz-${imageIndex}-${mode}.png`);
          await writeFile(file, png);
          const baseArgs = [
            file, "stdout", "--oem", "1", "-l", "eng",
            "-c", "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
            "-c", "load_system_dawg=0",
            "-c", "load_freq_dawg=0"
          ];
          for (const psm of ["6", "11"]) {
            const text = await execFileAsync("tesseract", [...baseArgs, "--psm", psm]);
            const verified = validateCandidates(text);
            if (verified) return verified;
          }
        } catch (error) {
          console.warn("Native MRZ OCR attempt failed:", error instanceof Error ? error.message : "unknown error");
        }
      }
    }
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
