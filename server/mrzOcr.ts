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
  const lines = raw.split(/\r?\n/).map(cleanOcr).filter(Boolean);
  const expanded: string[] = [...lines];
  for (const line of lines) {
    if (line.length >= 88) {
      for (let i = 0; i + 44 <= line.length; i += 44) expanded.push(line.slice(i, i + 44));
    }
  }

  const first: string[] = [];
  const second: string[] = [];
  for (const line of expanded) {
    const p = line.indexOf("P<");
    if (p >= 0 && line.length - p >= 44) first.push(line.slice(p, p + 44));
    if (/^[A-Z0-9<]{44}$/.test(line)) second.push(line);
  }

  for (let i = 0; i < expanded.length; i++) {
    const a = expanded[i];
    const p = a.indexOf("P<");
    if (p >= 0 && a.length - p >= 44) {
      const l1 = a.slice(p, p + 44);
      for (let j = i + 1; j < Math.min(i + 4, expanded.length); j++) {
        if (expanded[j].length >= 44) second.push(expanded[j].slice(0, 44));
      }
      first.push(l1);
    }
  }
  return [[...new Set(first)], [...new Set(second)]];
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
          const text = await execFileAsync("tesseract", [
            file, "stdout", "--oem", "1", "-l", "eng", "--psm", "6",
            "-c", "tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<"
          ]);
          const verified = validateCandidates(text);
          if (verified) return verified;
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
