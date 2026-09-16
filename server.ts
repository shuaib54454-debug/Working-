import express from "express";
import { GoogleGenAI } from "@google/genai";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, cert, getApps, App as FirebaseAdminApp } from "firebase-admin/app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

const configPath = path.join(__dirname, "firebase-applet-config.json");
let firebaseConfig: any = {};
try { firebaseConfig = JSON.parse(readFileSync(configPath, "utf-8")); } catch (error) { console.error("Failed to load Firebase config:", error); }
const PRIMARY_PROJECT_ID = String(firebaseConfig?.projectId || "");
const ALLOWED_PROJECT_IDS = new Set<string>([PRIMARY_PROJECT_ID, ...(Array.isArray(firebaseConfig?.allowedProjectIds) ? firebaseConfig.allowedProjectIds : [])].filter(Boolean).map(String));
const firebaseApps = new Map<string, FirebaseAdminApp>();

function getFirebaseAuthForProject(projectId: string) {
  if (!ALLOWED_PROJECT_IDS.has(projectId)) throw new Error("Unauthorized Firebase project");
  let firebaseApp = firebaseApps.get(projectId);
  if (!firebaseApp) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (String(serviceAccount.project_id || "") !== projectId) throw new Error("Firebase service account project mismatch");
    firebaseApp = getApps().find((candidate) => candidate.name === `auth-${projectId}`);
    if (!firebaseApp) firebaseApp = initializeApp({ credential: cert(serviceAccount), projectId }, `auth-${projectId}`);
    firebaseApps.set(projectId, firebaseApp);
  }
  return getAuth(firebaseApp);
}

function getTokenProjectId(idToken: string): string {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed Firebase ID token");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
  const projectId = typeof payload?.aud === "string" ? payload.aud : "";
  if (!projectId || !ALLOWED_PROJECT_IDS.has(projectId)) throw new Error("Unauthorized Firebase project");
  return projectId;
}

async function verifyPassportScanAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ success: false, error: "Authentication required" });
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken === "guest" || idToken === "applet-agency-session" || idToken.startsWith("local-mode-user:")) return res.status(401).json({ success: false, error: "A verified Firebase ID token is required" });
  try {
    const projectId = getTokenProjectId(idToken);
    const decoded = await getFirebaseAuthForProject(projectId).verifyIdToken(idToken, true);
    req.user = decoded;
    return next();
  } catch (error) {
    console.warn("Passport scan authentication failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(401).json({ success: false, error: "Invalid or expired authentication token" });
  }
}

const geminiKey = process.env.GEMINI_API_KEY;
const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, X-Client-Version, X-Platform");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString(), service: "shuayb-recruitment-api", hasGeminiKey: !!geminiKey, projectId: PRIMARY_PROJECT_ID, allowedProjects: [...ALLOWED_PROJECT_IDS] }));

app.post("/api/scan-passport", verifyPassportScanAuth, async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body || {};
    if (typeof imageBase64 !== "string" || imageBase64.length < 100) return res.status(400).json({ success: false, error: "Valid passport image is required" });
    if (!ai) return res.status(503).json({ success: false, error: "Passport scanning service is not configured" });
    const prompt = `Analyze this passport image for OCR and MRZ data. Never invent, repair, synthesize, reconstruct, or guess any MRZ characters or passport fields. Return JSON only. Set overallStatus to VERIFIED only when a complete visible MRZ is present and all check digits/checksums validate. If the MRZ is missing, incomplete, unreadable, or invalid, return overallStatus as NEEDS_REVIEW and preserve uncertainty rather than fabricating values. Extract visible fields only: passportNumber, surname, givenNames, nationality, dateOfBirth, sex, dateOfExpiry, issuingCountry, mrz, and confidence.`;
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
    let lastError: unknown = null;
    for (const model of models) {
      try {
        const result = await ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: imageBase64.replace(/^data:[^;]+;base64,/, "") } }, { text: prompt }] }], config: { responseMimeType: "application/json" } });
        const text = result.text?.trim();
        if (!text) throw new Error("Empty Gemini response");
        const parsed = JSON.parse(text);
        return res.json({ success: true, data: parsed, model });
      } catch (error) {
        lastError = error;
        console.warn(`Gemini passport scan failed for ${model}:`, error instanceof Error ? error.message : "unknown error");
      }
    }
    console.error("All Gemini passport scan models failed:", lastError);
    return res.status(502).json({ success: false, error: "Passport scanning service failed" });
  } catch (error) {
    console.error("Passport scan request failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(500).json({ success: false, error: "Passport scan request failed" });
  }
});

app.get("/api/download-apk", (_req, res) => {
  const apkPath = path.join(__dirname, "public", "app-debug.apk");
  if (!existsSync(apkPath)) return res.status(404).send("APK not found");
  return res.download(apkPath, "shuayb-recruitment-debug.apk");
});
app.get("/download/app-debug.apk", (_req, res) => {
  const apkPath = path.join(__dirname, "public", "app-debug.apk");
  if (!existsSync(apkPath)) return res.status(404).send("APK not found");
  return res.download(apkPath, "shuayb-recruitment-debug.apk");
});
app.get("/app-debug.apk", (_req, res) => {
  const apkPath = path.join(__dirname, "public", "app-debug.apk");
  if (!existsSync(apkPath)) return res.status(404).send("APK not found");
  return res.download(apkPath, "shuayb-recruitment-debug.apk");
});

app.get("/manifest.webmanifest", (_req, res) => res.sendFile(path.join(__dirname, "public", "manifest.webmanifest")));
app.get("/sw.js", (_req, res) => res.sendFile(path.join(__dirname, "public", "sw.js")));
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://0.0.0.0:${PORT}`));