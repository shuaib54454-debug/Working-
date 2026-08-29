var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0213401665";
var adminApp = null;
var adminAuth = null;
function getFirebaseAuth() {
  if (!adminAuth) {
    try {
      const existingApps = (0, import_app.getApps)();
      if (existingApps.length === 0) {
        adminApp = (0, import_app.initializeApp)({
          projectId: FIREBASE_PROJECT_ID
        });
      } else {
        adminApp = existingApps[0];
      }
      adminAuth = (0, import_auth.getAuth)(adminApp);
    } catch (initErr) {
      console.warn("Firebase Admin initialize warning:", initErr);
      if (!adminApp) {
        adminApp = (0, import_app.initializeApp)({ projectId: FIREBASE_PROJECT_ID }, "shuayb-admin");
      }
      adminAuth = (0, import_auth.getAuth)(adminApp);
    }
  }
  return adminAuth;
}
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
app.use(import_express.default.json({ limit: "25mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "25mb" }));
var aiClient = null;
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({ apiKey });
  }
  return aiClient;
}
async function verifyFirebaseIdToken(req, res, next) {
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
    const decodedToken = await authService.verifyIdToken(idToken, true);
    if (!decodedToken || !decodedToken.uid) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid token payload."
      });
    }
    req.user = decodedToken;
    return next();
  } catch (authError) {
    console.warn("Firebase ID Token verification failed:", authError?.message || authError);
    const errorMessage = authError?.code === "auth/id-token-expired" ? "Unauthorized: Token has expired. Please refresh session." : authError?.code === "auth/id-token-revoked" ? "Unauthorized: Token has been revoked." : "Unauthorized: Invalid Firebase ID token.";
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "shuayb-agency-backend",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    projectId: FIREBASE_PROJECT_ID
  });
});
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
    const user = req.user;
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
    "fullNameArabic": "\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064A\u0629 \u0625\u0630\u0627 \u0648\u062C\u062F",
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
    let lastError = null;
    let parsedResult = null;
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
        } catch (err) {
          lastError = err;
          const status = err?.status || err?.code;
          const isHighDemand = status === 503 || status === "UNAVAILABLE" || err?.message && err.message.includes("high demand");
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
  } catch (error) {
    console.error("Error in /api/scan-passport:", error);
    return res.status(500).json({
      error: error.message || "Failed to process passport image",
      fallback: false
    });
  }
});
app.get(["/sw.js", "/serviceworker.js"], (req, res) => {
  const swPath = import_path.default.join(process.cwd(), "public/sw.js");
  if (import_fs.default.existsSync(swPath)) {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Service-Worker-Allowed", "/");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    return res.sendFile(swPath);
  }
  res.status(404).send("Service worker not found");
});
app.get(["/manifest.json", "/manifest.webmanifest"], (req, res) => {
  const manifestPath = import_path.default.join(process.cwd(), "public/manifest.json");
  if (import_fs.default.existsSync(manifestPath)) {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.sendFile(manifestPath);
  }
  res.status(404).send("Manifest not found");
});
app.get(["/api/download-apk", "/download/app-debug.apk", "/app-debug.apk"], (req, res) => {
  const apkPath = import_path.default.join(process.cwd(), "android/app/build/outputs/apk/debug/app-debug.apk");
  if (import_fs.default.existsSync(apkPath)) {
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Shuayb Agency Server] Listening on http://0.0.0.0:${PORT} (ENV: ${process.env.NODE_ENV || "development"})`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
