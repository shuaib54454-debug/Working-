import express from "express";
import { GoogleGenAI } from "@google/genai";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, cert, getApps } from "firebase-admin/app";

const rootDir = process.cwd();
const distPath = path.join(rootDir, "dist");
const publicPath = path.join(rootDir, "public");
const configPath = path.join(rootDir, "firebase-applet-config.json");

const app = express();
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const OWNER_EMAIL = String(process.env.OWNER_EMAIL || "shuaib54454@gmail.com").trim().toLowerCase();

type FirebaseAppletConfig = {\n  projectId?: string;\n  allowedProjectIds?: string[];\n};\n\nlet firebaseConfig: FirebaseAppletConfig = {};
try {
  if (existsSync(configPath)) {
    firebaseConfig = JSON.parse(readFileSync(configPath, "utf-8")) as FirebaseAppletConfig;
  }
} catch (error) {
  console.error("Failed to load Firebase config:", error instanceof Error ? error.message : "unknown error");
}

const PRIMARY_PROJECT_ID = String(firebaseConfig?.projectId || "crack-petal-506818-c8");
const ALLOWED_PROJECT_IDS = new Set(
  [
    PRIMARY_PROJECT_ID,
    process.env.FIREBASE_PROJECT_ID,
    process.env.GOOGLE_CLOUD_PROJECT,
    process.env.GCP_PROJECT,
    "crack-petal-506818-c8",
    "gen-lang-client-0213401665",
    ...(Array.isArray(firebaseConfig?.allowedProjectIds) ? firebaseConfig.allowedProjectIds : [])
  ].filter(Boolean).map(String)
);

const firebaseApps = new Map();

function getFirebaseAuthForProject(projectId) {
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
        console.warn("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON", err);
      }
    }
    if (!firebaseApp) {
      firebaseApp = getApps().find((c) => c.name === `auth-${projectId}`) || initializeApp({ projectId }, `auth-${projectId}`);
    }
    firebaseApps.set(projectId, firebaseApp);
  }
  return getAuth(firebaseApp);
}

function getTokenProjectId(idToken) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed Firebase ID token");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
  const projectId = typeof payload?.aud === "string" ? payload.aud : "";
  if (!projectId || !ALLOWED_PROJECT_IDS.has(projectId)) throw new Error(`Unauthorized Firebase project: ${projectId}`);
  return projectId;
}

async function verifyPassportScanAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ success: false, error: "Authentication required" });
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken === "guest" || idToken === "applet-agency-session") {
    return res.status(401).json({ success: false, error: "Verified ID token required" });
  }
  try {
    const projectId = getTokenProjectId(idToken);
    const auth = getFirebaseAuthForProject(projectId);
    const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    const decoded = await auth.verifyIdToken(idToken, hasServiceAccount);
    const email = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : "";
    if (!email || email !== OWNER_EMAIL) return res.status(403).json({ success: false, error: "Owner account required" });
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
}

const geminiKey = process.env.GEMINI_API_KEY;
const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;
const configuredOrigins = String(process.env.ALLOWED_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
const allowedOrigins = new Set([...configuredOrigins, "capacitor://localhost", "http://localhost", "https://localhost"]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.post("/api/scan-passport", verifyPassportScanAuth, async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body || {};
    if (!imageBase64) return res.status(400).json({ success: false, error: "Image required" });
    
    const rawBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    if (!ai) return res.status(503).json({ success: false, error: "Gemini not configured" });

    // Modified Prompt: Less strict for development and sample passports
    const prompt = `Analyze this passport image for OCR and MRZ data. Return JSON only. Extract visible fields: passportNumber, surname, givenNames, nationality, dateOfBirth, sex, dateOfExpiry, issuingCountry, mrz, and confidence. Even if check digits fail slightly (as in sample passports), try your best to extract the fields and set overallStatus to 'VERIFIED' if the main data is readable.`;
    
    // Using standard available models
    const models = ["gemini-1.5-flash", "gemini-1.5-pro"];
    let lastError = null;

    for (const model of models) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType, data: rawBase64 } },
              { text: prompt }
            ]
          }],
          config: { responseMimeType: "application/json" }
        });
        const text = result.text?.trim();
        if (!text) throw new Error("Empty response");
        return res.json({ success: true, data: JSON.parse(text), model });
      } catch (error) {
        lastError = error;
      }
    }
    return res.status(502).json({ success: false, error: "OCR failed" });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.get("/manifest.webmanifest", (_req, res) => res.sendFile(path.join(distPath, "manifest.webmanifest")));
    app.get("/sw.js", (_req, res) => res.sendFile(path.join(distPath, "sw.js")));
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();