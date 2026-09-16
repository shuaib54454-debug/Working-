import express from "express";
import cors from "cors";
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

app.use(cors({ origin: true, credentials: true, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "Cache-Control", "Pragma", "X-Client-Version", "X-Platform"] }));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString(), service: "shuayb-recruitment-api", hasGeminiKey: !!geminiKey, projectId: PRIMARY_PROJECT_ID, allowedProjects: [...ALLOWED_PROJECT_IDS] }));

app.post("/api/scan-passport", verifyPassportScanAuth, async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: "imageBase64 is required" });
    if (!ai) return res.status(503).json({ error: "AI service not configured" });
    const prompt = `Analyze this passport image and extract passport information. Read the MRZ exactly as visibly printed. Never invent, repair, synthesize, or reconstruct an MRZ that is not visibly present. Treat uncertain fields as empty/unknown. Return JSON including passportNumber, surname, givenNames, nationality, birthDateFormatted, expiryDateFormatted, gender, mrz, overallStatus, and validityAnalysis. overallStatus may be VERIFIED only when the visible MRZ is complete and its checksums validate.`;
    const models = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
    let lastError: unknown;
    for (const model of models) {
      try {
        const result = await ai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] }], config: { responseMimeType: "application/json" } });
        const text = result.text?.trim();
        if (!text) throw new Error("Empty AI response");
        return res.json({ success: true, data: JSON.parse(text) });
      } catch (error) { lastError = error; }
    }
    console.error("All passport scan models failed:", lastError instanceof Error ? lastError.message : "unknown error");
    return res.status(502).json({ success: false, error: "Passport scanning failed. Please retry or review the passport manually." });
  } catch (error) {
    console.error("Passport scan error:", error instanceof Error ? error.message : "unknown error");
    return res.status(500).json({ success: false, error: "Passport scanning failed" });
  }
});

app.get("/api/download-apk", (_req, res) => { const apkPath = path.join(__dirname, "android/app/build/outputs/apk/debug/app-debug.apk"); if (!existsSync(apkPath)) return res.status(404).json({ error: "APK not found" }); res.download(apkPath, "Shuayb-Agency.apk"); });
app.get("/download/app-debug.apk", (_req, res) => { const apkPath = path.join(__dirname, "android/app/build/outputs/apk/debug/app-debug.apk"); if (!existsSync(apkPath)) return res.status(404).send("APK not found"); res.download(apkPath, "Shuayb-Agency.apk"); });
app.get("/app-debug.apk", (_req, res) => { const apkPath = path.join(__dirname, "android/app/build/outputs/apk/debug/app-debug.apk"); if (!existsSync(apkPath)) return res.status(404).send("APK not found"); res.download(apkPath, "Shuayb-Agency.apk"); });
app.get("/manifest.json", (_req, res) => res.sendFile(path.join(__dirname, "public/manifest.json")));
app.get("/manifest.webmanifest", (_req, res) => res.sendFile(path.join(__dirname, "public/manifest.json")));
app.get("/sw.js", (_req, res) => res.sendFile(path.join(__dirname, "public/sw.js")));
app.get("/serviceworker.js", (_req, res) => res.sendFile(path.join(__dirname, "public/sw.js")));
const distDir = path.join(__dirname, "dist");
if (existsSync(distDir)) app.use(express.static(distDir));
app.get("*", (req, res) => { if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Not found" }); const indexPath = path.join(distDir, "index.html"); if (existsSync(indexPath)) return res.sendFile(indexPath); return res.status(404).send("Not found"); });
app.listen(PORT, "0.0.0.0", () => console.log(`Shuayb Recruitment server running on port ${PORT}`));