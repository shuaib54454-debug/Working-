import express from "express";
import { GoogleGenAI } from "@google/genai";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { createVerify } from "crypto";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, cert, getApps, App as FirebaseAdminApp } from "firebase-admin/app";
import sharp from "sharp";
import { extractVerifiedMrzWithNativeOcr } from "./server/mrzOcr";
import { parseTD3MRZ } from "./src/lib/mrzScanner";

const rootDir = process.cwd();
const distPath = path.join(rootDir, "dist");
const publicPath = path.join(rootDir, "public");
const configPath = path.join(rootDir, "firebase-applet-config.json");

const app = express();
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const OWNER_EMAIL = String(process.env.OWNER_EMAIL || "shuaib54454@gmail.com").trim().toLowerCase();

let firebaseConfig: any = {};
try {
  if (existsSync(configPath)) {
    firebaseConfig = JSON.parse(readFileSync(configPath, "utf-8"));
  }
} catch (error) {
  console.error("Failed to load Firebase config:", error instanceof Error ? error.message : "unknown error");
}
const PRIMARY_PROJECT_ID = String(firebaseConfig?.projectId || "crack-petal-506818-c8");
const ALLOWED_PROJECT_IDS = new Set<string>(
  [
    PRIMARY_PROJECT_ID,
    process.env.FIREBASE_PROJECT_ID,
    process.env.GOOGLE_CLOUD_PROJECT,
    process.env.GCP_PROJECT,
    "crack-petal-506818-c8",
    "gen-lang-client-0213401665",
    ...(Array.isArray(firebaseConfig?.allowedProjectIds) ? firebaseConfig.allowedProjectIds : [])
  ]
    .filter(Boolean)
    .map(String)
);
const firebaseApps = new Map<string, FirebaseAdminApp>();

function getFirebaseAuthForProject(projectId: string) {
  if (!ALLOWED_PROJECT_IDS.has(projectId)) throw new Error(`Unauthorized Firebase project: ${projectId}`);
  let firebaseApp = firebaseApps.get(projectId);
  if (!firebaseApp) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        if (String(serviceAccount.project_id || "") === projectId) {
          firebaseApp = initializeApp({ credential: cert(serviceAccount), projectId }, `auth-${projectId}`);
        }
      } catch (err) {
        console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON, falling back to public key verification:", err instanceof Error ? err.message : err);
      }
    }
    if (!firebaseApp) {
      firebaseApp = getApps().find((candidate) => candidate.name === `auth-${projectId}`) ||
        initializeApp({ projectId }, `auth-${projectId}`);
    }
    firebaseApps.set(projectId, firebaseApp);
  }
  return getAuth(firebaseApp);
}

function getTokenProjectId(idToken: string): string {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed Firebase ID token");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
  const projectId = typeof payload?.aud === "string" ? payload.aud : "";
  if (!projectId || !ALLOWED_PROJECT_IDS.has(projectId)) {
    throw new Error(`Unauthorized Firebase project: ${projectId}`);
  }
  return projectId;
}

type FirebasePublicKeys = Record<string, string>;
let firebasePublicKeysCache: { keys: FirebasePublicKeys; expiresAt: number } | null = null;

async function getFirebasePublicKeys(forceRefresh = false): Promise<FirebasePublicKeys> {
  const now = Date.now();
  if (!forceRefresh && firebasePublicKeysCache && firebasePublicKeysCache.expiresAt > now) {
    return firebasePublicKeysCache.keys;
  }
  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    { headers: { Accept: "application/json" } }
  );
  if (!response.ok) throw new Error(`Firebase public key fetch failed: HTTP ${response.status}`);
  const keys = (await response.json()) as FirebasePublicKeys;
  const cacheControl = response.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\\d+)/i);
  const maxAgeSeconds = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  firebasePublicKeysCache = {
    keys,
    expiresAt: now + Math.max(60, Math.min(maxAgeSeconds, 86400)) * 1000
  };
  return keys;
}

/**
 * Fallback for non-Google hosts where Firebase Admin SDK service-account
 * credentials are unavailable. Firebase documents this third-party JWT
 * verification model using Google's published Secure Token certificates.
 */
async function verifyFirebaseIdTokenWithoutAdmin(idToken: string, projectId: string): Promise<any> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed Firebase ID token");

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf-8"));
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
  } catch {
    throw new Error("Malformed Firebase ID token");
  }

  if (header?.alg !== "RS256" || typeof header?.kid !== "string" || !header.kid) {
    throw new Error("Unsupported Firebase ID token header");
  }
  if (payload?.aud !== projectId) throw new Error("Firebase ID token audience mismatch");
  if (payload?.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Firebase ID token issuer mismatch");
  }
  if (typeof payload?.sub !== "string" || !payload.sub) {
    throw new Error("Firebase ID token subject is missing");
  }

  const now = Math.floor(Date.now() / 1000);
  const clockSkew = 5 * 60;
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new Error("Firebase ID token is expired");
  }
  if (typeof payload.iat !== "number" || payload.iat > now + clockSkew) {
    throw new Error("Firebase ID token issued-at time is invalid");
  }
  if (typeof payload.auth_time !== "number" || payload.auth_time > now + clockSkew) {
    throw new Error("Firebase ID token authentication time is invalid");
  }

  const signedData = `${parts[0]}.${parts[1]}`;
  const signature = Buffer.from(parts[2], "base64url");
  let keys = await getFirebasePublicKeys();
  let certificate = keys[header.kid];
  if (!certificate) {
    keys = await getFirebasePublicKeys(true);
    certificate = keys[header.kid];
  }
  if (!certificate) throw new Error("Firebase signing key not found");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(signedData);
  verifier.end();
  if (!verifier.verify(certificate, signature)) {
    throw new Error("Firebase ID token signature verification failed");
  }
  return payload;
}

async function verifyPassportScanAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ success: false, error: "Authentication required" });
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken === "guest" || idToken === "applet-agency-session" || idToken.startsWith("local-mode-user:")) {
    return res.status(401).json({ success: false, error: "A verified Firebase ID token is required" });
  }
  try {
    const projectId = getTokenProjectId(idToken);
    const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    const decoded = hasServiceAccount
      ? await getFirebaseAuthForProject(projectId).verifyIdToken(idToken, true)
      : await verifyFirebaseIdTokenWithoutAdmin(idToken, projectId);
    const email = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : "";
    if (!email || email !== OWNER_EMAIL) return res.status(403).json({ success: false, error: "Owner account required" });
    (req as any).user = decoded;
    return next();
  } catch (error) {
    console.warn("Passport scan authentication failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(401).json({ success: false, error: "Invalid or expired authentication token" });
  }
}

function normalizePassportScanResult(raw: any) {
  const source = raw && typeof raw === "object" ? raw : {};
  const mrz = source.mrz && typeof source.mrz === "object" ? source.mrz : {};
  const visual = source.visualZone && typeof source.visualZone === "object"
    ? source.visualZone
    : source.visual && typeof source.visual === "object"
      ? source.visual
      : {};

  const cleanMrzLine = (value: unknown) => {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, "").toUpperCase();
  };

  const line1 = cleanMrzLine([
    source.mrzLine1, source.mrz_line1, source.line1,
    mrz.mrzLine1, mrz.mrz_line1, mrz.line1, mrz.line_1
  ].find((value: unknown) => typeof value === "string"));
  const line2 = cleanMrzLine([
    source.mrzLine2, source.mrz_line2, source.line2,
    mrz.mrzLine2, mrz.mrz_line2, mrz.line2, mrz.line_2
  ].find((value: unknown) => typeof value === "string"));

  const hasCompleteMrz =
    line1.length === 44 &&
    line2.length === 44 &&
    line1.startsWith("P<") &&
    /^[A-Z0-9<]+$/.test(line1) &&
    /^[A-Z0-9<]+$/.test(line2);

  const cleanText = (value: unknown) =>
    typeof value === "string" && value.trim() && value.trim().toLowerCase() !== "null"
      ? value.trim()
      : undefined;

  return {
    mrzLine1: hasCompleteMrz ? line1 : undefined,
    mrzLine2: hasCompleteMrz ? line2 : undefined,
    visualZone: {
      firstName: cleanText(visual.firstName ?? source.firstName),
      lastName: cleanText(visual.lastName ?? source.lastName),
      fullName: cleanText(visual.fullName ?? source.fullName),
      fullNameArabic: cleanText(visual.fullNameArabic ?? source.fullNameArabic),
      passportNumber: cleanText(visual.passportNumber ?? source.passportNumber),
      birthDate: cleanText(visual.birthDate ?? source.birthDate),
      expiryDate: cleanText(visual.expiryDate ?? source.expiryDate),
      gender: cleanText(visual.gender ?? source.gender),
      nationality: cleanText(visual.nationality ?? source.nationality),
      jobTitle: cleanText(visual.jobTitle ?? source.jobTitle)
    },
    mrzDetected: hasCompleteMrz
  };
}

async function buildMrzFocusedImages(rawBase64: string): Promise<string[]> {
  try {
    const input = Buffer.from(rawBase64, "base64");
    const metadata = await sharp(input).metadata();
    const width = metadata.width;
    const height = metadata.height;
    if (!width || !height || height < 200) return [];

    const outputs: string[] = [];
    const addCrop = async (left: number, top: number, cropWidth: number, cropHeight: number) => {
      if (cropWidth < 120 || cropHeight < 80) return;
      const output = await sharp(input)
        .extract({
          left: Math.max(0, Math.floor(left)),
          top: Math.max(0, Math.floor(top)),
          width: Math.min(Math.floor(cropWidth), width - Math.max(0, Math.floor(left))),
          height: Math.min(Math.floor(cropHeight), height - Math.max(0, Math.floor(top)))
        })
        .resize({ width: Math.min(Math.max(Math.floor(cropWidth), 1800), 3200), withoutEnlargement: false })
        .grayscale()
        .normalize()
        .sharpen({ sigma: 1.2 })
        .jpeg({ quality: 97, chromaSubsampling: "4:4:4" })
        .toBuffer();
      outputs.push(output.toString("base64"));
    };

    // Try the lower part of the whole image, plus lower-left/lower-center crops.
    // Passport scans are often composite images where the passport page occupies
    // only part of the frame; isolating that region gives Gemini a much larger MRZ.
    for (const ratio of [0.38, 0.48, 0.58]) {
      const top = Math.floor(height * ratio);
      await addCrop(0, top, width, height - top);
    }

    const lowerTop = Math.floor(height * 0.35);
    await addCrop(0, lowerTop, Math.floor(width * 0.72), height - lowerTop);
    await addCrop(Math.floor(width * 0.08), lowerTop, Math.floor(width * 0.62), height - lowerTop);
    await addCrop(Math.floor(width * 0.25), lowerTop, Math.floor(width * 0.70), height - lowerTop);

    return outputs;
  } catch (error) {
    console.warn("Could not prepare focused MRZ images:", error instanceof Error ? error.message : "unknown error");
    return [];
  }
}
const geminiKey = process.env.GEMINI_API_KEY;
const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

async function locateMrzWithGemini(base64: string, mimeType: string): Promise<string | null> {
  if (!ai) return null;
  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: "Locate ONLY the two-line ICAO TD3 Machine Readable Zone (MRZ) on this passport image. Do not read or return any passport data. Return JSON only: {x,y,width,height,confidence}. Coordinates must be normalized 0..1 relative to the full image and form a tight rectangle around BOTH MRZ lines, including a small margin. If no MRZ is visible, return width:0,height:0,confidence:0. Do not invent a location." }
        ]
      }],
      config: { responseMimeType: "application/json" }
    });
    const parsed = JSON.parse(result.text?.trim() || "{}");
    const x = Number(parsed.x);
    const y = Number(parsed.y);
    const width = Number(parsed.width);
    const height = Number(parsed.height);
    const confidence = Number(parsed.confidence);
    if (![x, y, width, height, confidence].every(Number.isFinite)) return null;
    if (confidence < 0.5 || width <= 0 || height <= 0) return null;
    if (x < 0 || y < 0 || x + width > 1 || y + height > 1) return null;

    const input = Buffer.from(base64, "base64");
    const metadata = await sharp(input).metadata();
    const imageWidth = metadata.width || 0;
    const imageHeight = metadata.height || 0;
    if (!imageWidth || !imageHeight) return null;

    const left = Math.max(0, Math.floor(imageWidth * x));
    const top = Math.max(0, Math.floor(imageHeight * y));
    const cropWidth = Math.min(imageWidth - left, Math.max(160, Math.floor(imageWidth * width)));
    const cropHeight = Math.min(imageHeight - top, Math.max(90, Math.floor(imageHeight * height)));
    if (cropWidth < 160 || cropHeight < 90) return null;

    const output = await sharp(input)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize({ width: 3200, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.4 })
      .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
      .toBuffer();
    return output.toString("base64");
  } catch (error) {
    console.warn("Gemini MRZ localization failed:", error instanceof Error ? error.message : "unknown error");
    return null;
  }
}

// CORS is allowlisted. Never reflect an arbitrary Origin while credentials are enabled.
const configuredOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set<string>([
  ...configuredOrigins,
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "http://localhost:3000",
  "https://localhost:3000",
  // Firebase Hosting production origins for the Working- web application.
  "https://crack-petal-506818-c8.web.app",
  "https://crack-petal-506818-c8.firebaseapp.com"
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-Client-Version, X-Platform");
  if (req.method === "OPTIONS") {
    if (origin && !allowedOrigins.has(origin)) return res.sendStatus(403);
    return res.sendStatus(204);
  }
  return next();
});

app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Health is intentionally non-diagnostic: do not expose project IDs, key presence,
// or deployment details to unauthenticated callers.
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/scan-passport", verifyPassportScanAuth, async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body || {};
    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
      return res.status(400).json({ success: false, error: "Valid passport image is required" });
    }
    if (!allowedMimeTypes.has(mimeType)) {
      return res.status(400).json({ success: false, error: "Unsupported image type" });
    }

    const rawBase64 = imageBase64
      .replace(/^data:[^;]+;base64,/, "")
      .replace(/\s/g, "");

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(rawBase64) || rawBase64.length % 4 !== 0) {
      return res.status(400).json({ success: false, error: "Invalid image encoding" });
    }

    const estimatedBytes = Math.floor((rawBase64.length * 3) / 4);
    if (estimatedBytes > 8 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: "Passport image is too large" });
    }

    /*
     * SIMPLE PASSPORT SCAN:
     * One Gemini Vision request reads the passport page and extracts the fields.
     * MRZ is optional. It is useful when visible, but it must never block normal
     * passport data capture. This removes the previous long OCR -> locator ->
     * OCR -> Gemini chain that caused the mobile timeout.
     */
    if (ai) {
      try {
        const prompt = 'You are a passport data extraction service.\\n' +
          'First decide whether this image clearly shows a passport biodata/photo page.\\n' +
          'Return JSON only with exactly these keys:\\n' +
          '{\\n' +
          '  "passportDetected": true or false,\\n' +
          '  "confidence": number from 0 to 1,\\n' +
          '  "visualZone": {\\n' +
          '    "firstName": "", "lastName": "", "fullName": "", "fullNameArabic": "",\\n' +
          '    "passportNumber": "", "birthDate": "", "expiryDate": "",\\n' +
          '    "gender": "", "nationality": "", "jobTitle": ""\\n' +
          '  },\\n' +
          '  "mrzLine1": "",\\n' +
          '  "mrzLine2": ""\\n' +
          '}\\n' +
          'Rules:\\n' +
          '- Read only information actually visible in the image. Never invent or guess.\\n' +
          '- If this is not a passport biodata page, set passportDetected=false and leave all fields empty.\\n' +
          '- Extract the passport number, name, date of birth, expiry date, gender and nationality when clearly visible.\\n' +
          '- Dates may be returned as YYYY-MM-DD, DD/MM/YYYY, or the exact printed date.\\n' +
          '- jobTitle should be empty unless a profession is explicitly printed on the passport.\\n' +
          '- mrzLine1 and mrzLine2 are optional. Return them only when each complete TD3 line is clearly visible; otherwise leave them empty.\\n' +
          '- Do not delay the response for MRZ. The main goal is simply to identify the passport and record its visible data.';

        const geminiRequest = ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType, data: rawBase64 } },
              { text: prompt }
            ]
          }],
          config: { responseMimeType: "application/json" }
        });

        const result = await Promise.race([
          geminiRequest,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Passport AI timeout")), 25000)
          )
        ]);

        const text = result.text?.trim();
        if (!text) throw new Error("Empty Gemini response");

        const parsed = JSON.parse(text);
        const normalized = normalizePassportScanResult(parsed);
        const visual = normalized.visualZone;
        const hasVisibleData = Boolean(
          visual.firstName ||
          visual.lastName ||
          visual.fullName ||
          visual.fullNameArabic ||
          visual.passportNumber ||
          visual.birthDate ||
          visual.expiryDate
        );

        if (parsed.passportDetected === true && hasVisibleData) {
          return res.json({
            success: true,
            data: normalized,
            passportDetected: true,
            confidence: Number(parsed.confidence) || 0,
            model: "gemini-2.5-flash-simple-passport"
          });
        }

        if (parsed.passportDetected === false) {
          return res.status(422).json({
            success: false,
            passportDetected: false,
            error: "لم يتم التعرف على صورة جواز سفر واضحة. يرجى رفع صورة صفحة الجواز."
          });
        }
      } catch (error) {
        console.warn(
          "Simple Gemini passport extraction failed; trying local MRZ fallback:",
          error instanceof Error ? error.message : "unknown error"
        );
      }
    }

    /*
     * Fallback only: native OCR is now used after Gemini, not before it.
     * This prevents the expensive OCR pipeline from causing the normal request
     * to time out.
     */
    try {
      const nativeVerifiedMrz = await extractVerifiedMrzWithNativeOcr([rawBase64]);
      if (nativeVerifiedMrz) {
        const data = normalizePassportScanResult({
          mrzLine1: nativeVerifiedMrz.line1,
          mrzLine2: nativeVerifiedMrz.line2
        });
        return res.json({
          success: true,
          data,
          passportDetected: true,
          confidence: 1,
          model: "native-mrz-fallback",
          mrzSource: "native-ocr-verified"
        });
      }
    } catch (error) {
      console.warn(
        "Native MRZ fallback failed:",
        error instanceof Error ? error.message : "unknown error"
      );
    }

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "Passport scanning service is not configured"
      });
    }

    return res.status(422).json({
      success: false,
      passportDetected: false,
      error: "لم يتم استخراج بيانات واضحة من الجواز. يرجى تجربة صورة أوضح."
    });
  } catch (error) {
    console.error(
      "Passport scan request failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return res.status(500).json({
      success: false,
      error: "Passport scan request failed"
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.get("/manifest.webmanifest", (_req, res) => {
      const distFile = path.join(distPath, "manifest.webmanifest");
      if (existsSync(distFile)) return res.sendFile(distFile);
      return res.sendFile(path.join(publicPath, "manifest.webmanifest"));
    });
    app.get("/sw.js", (_req, res) => {
      const distFile = path.join(distPath, "sw.js");
      if (existsSync(distFile)) return res.sendFile(distFile);
      return res.sendFile(path.join(publicPath, "sw.js"));
    });
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
