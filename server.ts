import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Must match the Firebase client project. Do not use a GCP/Gemini project as a fallback.
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "crack-petal-506818-c8";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!adminAuth) {
    try {
      const existingApps = getApps();
      if (existingApps.length === 0) {
        adminApp = initializeApp({ projectId: FIREBASE_PROJECT_ID });
      } else {
        adminApp = existingApps[0];
      }
      adminAuth = getAuth(adminApp);
    } catch (initErr) {
      console.warn("Firebase Admin initialize warning:", initErr);
      if (!adminApp) {
        adminApp = initializeApp({ projectId: FIREBASE_PROJECT_ID }, "shuayb-admin");
      }
      adminAuth = getAuth(adminApp);
    }
  }
  return adminAuth;
}

// Allow same-origin requests, Capacitor WebViews and local development.
// Cross-origin browser callers must be explicitly listed through APP_URL/CORS_ORIGINS.
const allowedOrigins = new Set(
  [
    process.env.APP_URL,
    ...(process.env.CORS_ORIGINS || "").split(","),
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ]
    .map((origin) => origin?.trim().replace(/\/$/, ""))
    .filter(Boolean) as string[]
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || origin.startsWith("capacitor://") || origin.startsWith("ionic://")) {
    // Same-origin and Capacitor requests do not need a cross-origin allowlist entry.
  } else if (allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

/** Strict Firebase ID-token verification. No tokeninfo fallback. */
async function verifyFirebaseIdToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing or malformed Authorization header (Bearer token required)."
    });
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    return res.status(401).json({ success: false, error: "Unauthorized: Empty token provided." });
  }

  try {
    const decodedToken = await getFirebaseAuth().verifyIdToken(idToken, false);
    if (!decodedToken?.uid) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired Firebase ID token.",
        code: "UNAUTHORIZED"
      });
    }
    (req as any).user = decodedToken;
    return next();
  } catch (authError: any) {
    console.warn("Firebase ID Token verification failed:", authError?.message || authError);
    const errorMessage =
      authError?.code === "auth/id-token-expired"
        ? "Unauthorized: Token has expired. Please refresh session."
        : authError?.code === "auth/id-token-revoked"
        ? "Unauthorized: Token has been revoked."
        : "Unauthorized: Invalid Firebase ID token.";
    return res.status(401).json({
      success: false,
      error: errorMessage,
      code: authError?.code || "UNAUTHORIZED"
    });
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "shuayb-agency-backend",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.post("/api/scan-passport", verifyFirebaseIdToken, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "No image provided" });

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured on the server environment.",
        fallback: false
      });
    }

    const user = (req as any).user;
    console.log(`[API] Authorized passport scan request by: ${user?.email || user?.uid}`);

    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    const prompt = `You are a high-precision international passport reader (ICAO Doc 9303 standard).
Analyze the provided passport image and extract both the Machine Readable Zone (MRZ) and the Visual Inspection Zone (VIZ) with extreme accuracy.

Return ONLY valid JSON strictly adhering to this structure without markdown formatting or code fences:
{
  "mrzLine1": "P<EGY...",
  "mrzLine2": "A12345678...",
  "visualZone": {
    "firstName": "First / Given Name in Arabic or English",
    "lastName": "Surname / Family Name in Arabic or English",
    "fullName": "Full Name in English",
    "fullNameArabic": "الاسم الكامل بالعربية إذا وجد",
    "passportNumber": "A12345678",
    "birthDate": "YYYY-MM-DD",
    "expiryDate": "YYYY-MM-DD",
    "issueDate": "YYYY-MM-DD",
    "gender": "male or female",
    "nationality": "Country Name in Arabic",
    "placeOfBirth": "City or Country",
    "jobTitle": "Job title if visible"
  }
}

Important Instructions:
1. "mrzLine1" must be exactly the top 44-character line starting with P<...
2. "mrzLine2" must be exactly the bottom 44-character line containing passport number, birthdate, expiry date, check digits, and composite digit.
3. If any field is not clearly visible in the visual zone, leave it null or omit it.`;

    const modelsToTry = [
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.7-flash",
      "gemini-3.1-pro-preview"
    ];

    let lastError: any = null;
    let parsedResult: any = null;

    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } },
                  { text: prompt }
                ]
              }
            ],
            config: { responseMimeType: "application/json" }
          });

          const responseText = response.text || "";
          const cleanedJson = responseText.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
          parsedResult = JSON.parse(cleanedJson);
          if (parsedResult) break;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const isHighDemand =
            status === 503 ||
            status === "UNAVAILABLE" ||
            (err?.message && err.message.includes("high demand"));
          console.warn(`Model ${modelName} (attempt ${attempt + 1}) encountered error:`, err?.message || err);
          if (isHighDemand && attempt === 0) await new Promise((resolve) => setTimeout(resolve, 600));
          else break;
        }
      }
      if (parsedResult) break;
    }

    if (!parsedResult) throw lastError || new Error("Unable to parse passport image with AI models");
    return res.json({ success: true, data: parsedResult });
  } catch (error: any) {
    console.error("Error in /api/scan-passport:", error);
    return res.status(500).json({
      error: error.message || "Failed to process passport image",
      fallback: false
    });
  }
});

app.get(["/sw.js", "/serviceworker.js"], (req, res) => {
  const swPath = path.join(process.cwd(), "public/sw.js");
  if (fs.existsSync(swPath)) {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.sendFile(swPath);
  }
  res.status(404).send("Service worker not found");
});

app.get(["/manifest.json", "/manifest.webmanifest"], (req, res) => {
  const manifestPath = path.join(process.cwd(), "public/manifest.json");
  if (fs.existsSync(manifestPath)) {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    return res.sendFile(manifestPath);
  }
  res.status(404).send("Manifest not found");
});

app.get(["/api/download-apk", "/download/app-debug.apk", "/app-debug.apk"], (req, res) => {
  const apkPath = path.join(process.cwd(), "android/app/build/outputs/apk/debug/app-debug.apk");
  if (fs.existsSync(apkPath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="Shuayb-Agency.apk"');
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    return res.sendFile(apkPath);
  }
  return res.status(404).json({ error: "APK not built yet.", path: apkPath });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Shuayb Agency Server] Listening on http://0.0.0.0:${PORT} (ENV: ${process.env.NODE_ENV || "development"})`);
  });
}

startServer();
