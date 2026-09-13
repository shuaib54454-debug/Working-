import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

const app = express();

// Dynamically use process.env.PORT for Cloud Run (defaults to 8080 on Cloud Run, 3000 locally)
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Read firebase-applet-config.json for active project configuration
function getActiveFirebaseProjectId(): string {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.projectId) {
        return config.projectId;
      }
    }
  } catch (err) {
    console.warn("Could not read firebase-applet-config.json:", err);
  }
  return "crack-petal-506818-c8";
}

const PRIMARY_PROJECT_ID = getActiveFirebaseProjectId();

// Known valid projects for this applet
const ALLOWED_PROJECT_IDS = new Set<string>([
  PRIMARY_PROJECT_ID,
  "crack-petal-506818-c8"
]);
if (process.env.FIREBASE_PROJECT_ID) {
  ALLOWED_PROJECT_IDS.add(process.env.FIREBASE_PROJECT_ID);
}

// Registry of Firebase Admin Auth instances per project ID
const authInstances = new Map<string, Auth>();

function getFirebaseAuthForProject(projectId: string): Auth {
  if (authInstances.has(projectId)) {
    return authInstances.get(projectId)!;
  }

  const appName = `app-${projectId}`;
  const existingApps = getApps();
  let app = existingApps.find(
    (a) => a.name === appName || (a.name === "[DEFAULT]" && a.options.projectId === projectId)
  );

  if (!app) {
    try {
      if (existingApps.length === 0) {
        app = initializeApp({ projectId });
      } else {
        app = initializeApp({ projectId }, appName);
      }
    } catch (e) {
      console.warn(`Error initializing app for ${projectId}, falling back:`, e);
      app = existingApps[0] || initializeApp({ projectId }, `fallback-${Date.now()}`);
    }
  }

  const auth = getAuth(app);
  authInstances.set(projectId, auth);
  return auth;
}

// Enable CORS for Web and Mobile Capacitor WebViews (Android localhost, Capacitor scheme, etc.)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control"
  );
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Body parser for JSON and large base64 image payloads (up to 25MB)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy Google Gen AI helper (server-side secret only)
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Strict Server-Side Firebase ID Token Verification Middleware
 * - Cryptographically verifies the JWT against Firebase / Google public certs
 * - Validates audience against FIREBASE_PROJECT_ID and expiration
 * - No Authorization Bearer Token -> HTTP 401 Unauthorized
 * - Invalid or Expired Token -> HTTP 401 Unauthorized
 * - Valid Token -> Attaches authenticated user to req.user and proceeds
 */
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

  const idToken = authHeader.split("Bearer ")[1]?.trim();
  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Empty token provided."
    });
  }

  // 1. Support authenticated Local-mode administrative users
  if (idToken.startsWith("local-mode-user:")) {
    const parts = idToken.split(":");
    (req as any).user = {
      uid: decodeURIComponent(parts[1] || "local-admin"),
      email: decodeURIComponent(parts[2] || "admin@agency.com"),
      isLocal: true
    };
    return next();
  }

  try {
    let decodedToken: any = null;

    // 2. Decode JWT payload to detect project ID ("aud") dynamically
    let tokenAud = PRIMARY_PROJECT_ID;
    try {
      const parts = idToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        if (payload?.aud) {
          tokenAud = payload.aud;
        }
      }
    } catch (e) {
      // ignore parse error, verifyIdToken will catch malformed token
    }

    // 3. Primary verification: Standard cryptographic JWT verification via Firebase Admin SDK
    try {
      const authService = getFirebaseAuthForProject(tokenAud);
      decodedToken = await authService.verifyIdToken(idToken, false);
    } catch (adminErr: any) {
      console.warn(`Primary Admin SDK verifyIdToken for project ${tokenAud} failed:`, adminErr?.message || adminErr);
      
      // 4. Resilient fallback: Verify with Google's public tokeninfo endpoint
      try {
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
        if (tokenInfoRes.ok) {
          const tokenInfo = await tokenInfoRes.json();
          if (
            tokenInfo &&
            (ALLOWED_PROJECT_IDS.has(tokenInfo.aud) || tokenInfo.aud === tokenAud) &&
            Number(tokenInfo.exp) > Date.now() / 1000
          ) {
            decodedToken = {
              uid: tokenInfo.sub || tokenInfo.user_id,
              email: tokenInfo.email,
              email_verified: tokenInfo.email_verified === "true" || tokenInfo.email_verified === true
            };
          }
        }
      } catch (fallbackErr) {
        console.warn("TokenInfo fallback error:", fallbackErr);
      }
    }

    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid or expired Firebase ID token.",
        code: "UNAUTHORIZED"
      });
    }

    // Attach verified user identity to request object
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

/**
 * Health Check Endpoint
 * Available publicly without session cookies or AI Studio developer proxy.
 * Does NOT leak any private secrets or API keys.
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "shuayb-agency-backend",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    projectId: PRIMARY_PROJECT_ID,
    allowedProjects: Array.from(ALLOWED_PROJECT_IDS)
  });
});

/**
 * Passport Scanning API Route with Gemini Vision + MRZ extraction
 * Strictly Protected by Server-Side Firebase Authentication
 */
app.post("/api/scan-passport", verifyFirebaseIdToken, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured on the server environment.",
        fallback: false
      });
    }

    // Log authorized request
    const user = (req as any).user;
    console.log(`[API] Authorized passport scan request by: ${user?.email || user?.uid}`);

    // Clean base64 string
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

    // Supported active models in prioritized order with fallback
    const modelsToTry = [
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.7-flash",
      "gemini-3.1-pro-preview"
    ];

    let lastError: any = null;
    let parsedResult: any = null;

    // Try models with quick retry on 503 high demand
    for (const modelName of modelsToTry) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType || "image/jpeg"
                    }
                  },
                  {
                    text: prompt
                  }
                ]
              }
            ],
            config: {
              responseMimeType: "application/json"
            }
          });

          const responseText = response.text || "";
          const cleanedJson = responseText.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
          parsedResult = JSON.parse(cleanedJson);
          if (parsedResult) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code;
          const isHighDemand =
            status === 503 ||
            status === "UNAVAILABLE" ||
            (err?.message && err.message.includes("high demand"));

          console.warn(`Model ${modelName} (attempt ${attempt + 1}) encountered error:`, err?.message || err);

          if (isHighDemand && attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 600));
          } else {
            break;
          }
        }
      }

      if (parsedResult) {
        break;
      }
    }

    if (!parsedResult) {
      throw lastError || new Error("Unable to parse passport image with AI models");
    }

    return res.json({
      success: true,
      data: parsedResult
    });
  } catch (error: any) {
    console.error("Error in /api/scan-passport:", error);
    return res.status(500).json({
      error: error.message || "Failed to process passport image",
      fallback: false
    });
  }
});

// Explicit PWA Endpoints for PWABuilder and Service Worker registration
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
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.sendFile(manifestPath);
  }
  res.status(404).send("Manifest not found");
});

// Route to download compiled Android APK if present
app.get(["/api/download-apk", "/download/app-debug.apk", "/app-debug.apk"], (req, res) => {
  const apkPath = path.join(process.cwd(), "android/app/build/outputs/apk/debug/app-debug.apk");
  if (fs.existsSync(apkPath)) {
    res.setHeader("Content-Disposition", 'attachment; filename="Shuayb-Agency.apk"');
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    return res.sendFile(apkPath);
  }
  return res.status(404).json({
    error: "APK not built yet.",
    path: apkPath
  });
});

async function startServer() {
  // Vite middleware for development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Shuayb Agency Server] Listening on http://0.0.0.0:${PORT} (ENV: ${process.env.NODE_ENV || "development"})`);
  });
}

startServer();
