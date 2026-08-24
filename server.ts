import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

// Body parser for JSON and large image payloads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy Google Gen AI helper
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Firebase ID Token Verification Middleware for Secure API Routes
async function verifyFirebaseIdToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized: Missing or invalid Authorization header. A valid Firebase ID Token is required."
      });
    }

    const idToken = authHeader.split("Bearer ")[1]?.trim();
    if (!idToken) {
      return res.status(401).json({
        error: "Unauthorized: Firebase ID Token is missing."
      });
    }

    // Verify token using Firebase Identity Toolkit REST endpoint
    const apiKey = process.env.VITE_FIREBASE_API_KEY || "AIzaSyCiD_AWhbx1Ls1qTgVDR1Vy9zJGgrk7WrA";
    const verifyUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;

    const verifyResponse = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    });

    if (!verifyResponse.ok) {
      const errData = await verifyResponse.json().catch(() => ({}));
      return res.status(401).json({
        error: "Unauthorized: Invalid or expired Firebase ID Token.",
        details: errData
      });
    }

    const userData = await verifyResponse.json();
    if (!userData.users || userData.users.length === 0) {
      return res.status(401).json({
        error: "Unauthorized: User not found."
      });
    }

    // Attach verified user info to request
    (req as any).user = userData.users[0];
    next();
  } catch (error) {
    console.error("Authentication verification error:", error);
    return res.status(500).json({
      error: "Internal server error during authentication verification."
    });
  }
}

// Passport Scanning API Route with Gemini Vision + MRZ extraction (Protected by Firebase ID Token)
app.post("/api/scan-passport", verifyFirebaseIdToken, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured on the server",
        fallback: true
      });
    }

    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    const prompt = `You are a high-precision international passport reader (ICAO Doc 9303 standard).
Analyze the provided passport image and extract both the Machine Readable Zone (MRZ) and the Visual Inspection Zone (VIZ) with extreme accuracy.

Return ONLY valid JSON strictly adhering to this structure without markdown formatting or code fences:
{
  "mrzLine1": "P<EGY...",
  "mrzLine2": "A12345678...",
  "visualZone": {
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
      // Attempt up to 2 times per model with brief backoff for transient 503/429
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
          const isHighDemand = status === 503 || status === "UNAVAILABLE" || (err?.message && err.message.includes("high demand"));
          console.warn(`Model ${modelName} (attempt ${attempt + 1}) encountered error:`, err?.message || err);
          
          if (isHighDemand && attempt === 0) {
            // Short backoff before 2nd attempt on same model
            await new Promise((resolve) => setTimeout(resolve, 600));
          } else {
            // Move to next model
            break;
          }
        }
      }

      if (parsedResult) {
        break; // Successfully got result
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
      fallback: true
    });
  }
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
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

// Route to download the compiled Android APK directly to phone
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
  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
