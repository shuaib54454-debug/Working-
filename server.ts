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

// Initialize Firebase Admin SDK (lazy / safe singleton)
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  "gen-lang-client-0213401665";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!adminAuth) {
    try {
      const existingApps = getApps();
      if (existingApps.length === 0) {
        adminApp = initializeApp({
          projectId: FIREBASE_PROJECT_ID
        });
      } else {
        adminApp = existingApps[0];
      }
      adminAuth = getAuth(adminApp);
    } catch (initErr) {
      console.warn("Firebase Admin initialize warning:", initErr);
      // Fallback instance initialization
      if (!adminApp) {
        adminApp = initializeApp({ projectId: FIREBASE_PROJECT_ID }, "shuayb-admin");
      }
      adminAuth = getAuth(adminApp);
    }
  }
  return adminAuth;
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

  try {
    const authService = getFirebaseAuth();
    // Cryptographically verify ID token against Google's public keys for the project
    const decodedToken = await authService.verifyIdToken(idToken, true);

    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid token payload."
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
    projectId: FIREBASE_PROJECT_ID
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
