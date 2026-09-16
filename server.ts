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

interface AuthenticatedUser {
  uid: string;
  email?: string;
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const app = express();
const PORT = Number.parseInt(process.env.PORT || "3000", 10);

const configPath = path.join(__dirname, "firebase-applet-config.json");
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(readFileSync(configPath, "utf-8"));
} catch {
  console.warn("firebase-applet-config.json could not be loaded; Firebase auth may be unavailable.");
}

const PRIMARY_PROJECT_ID = String(firebaseConfig?.projectId || "");
const ALLOWED_PROJECT_IDS = new Set(
  [PRIMARY_PROJECT_ID, ...(Array.isArray(firebaseConfig?.allowedProjectIds) ? firebaseConfig.allowedProjectIds : [])]
    .map(String)
    .filter(Boolean),
);

const firebaseApps = new Map<string, FirebaseAdminApp>();

function getFirebaseAuthForProject(projectId: string) {
  if (!ALLOWED_PROJECT_IDS.has(projectId)) {
    throw new Error("Unauthorized Firebase project");
  }

  let firebaseApp = firebaseApps.get(projectId);
  if (!firebaseApp) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
    }
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (String(serviceAccount.project_id || "") !== projectId) {
      throw new Error("Firebase service account project mismatch");
    }
    firebaseApp = getApps().find((candidate) => candidate.name === `auth-${projectId}`);
    if (!firebaseApp) {
      firebaseApp = initializeApp({ credential: cert(serviceAccount), projectId }, `auth-${projectId}`);
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
    throw new Error("Unauthorized Firebase project");
  }
  return projectId;
}

async function verifyPassportScanAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Authentication required" });
  }

  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken || idToken === "guest" || idToken === "applet-agency-session" || idToken.startsWith("local-mode-user:")) {
    return res.status(401).json({ success: false, error: "A verified Firebase ID token is required" });
  }

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

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "Cache-Control", "Pragma", "X-Client-Version", "X-Platform"],
}));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "shuayb-recruitment-api", timestamp: new Date().toISOString() });
});

app.post("/api/scan-passport", verifyPassportScanAuth, async (req, res) => {
  try {
    const imageBase64 = typeof req.body?.imageBase64 === "string" ? req.body.imageBase64 : "";
    if (!imageBase64) return res.status(400).json({ success: false, error: "imageBase64 is required" });
    if (!ai) return res.status(503).json({ success: false, error: "Passport scanning service is not configured" });

    const models = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
    const prompt = `Analyze this passport image for OCR only. Extract visible passport data and the machine readable zone (MRZ) exactly as printed. Never invent, repair, synthesize, or reconstruct an MRZ that is not visibly present. Treat any uncertain field as empty/unknown. Return structured JSON with passportNumber, surname, givenNames, nationality, birthDateFormatted, expiryDateFormatted, gender, mrz, overallStatus, and validityAnalysis. overallStatus may be VERIFIED only when the visible MRZ is complete and its checksums validate.`;

    let lastError: unknown;
    for (const model of models) {
      try {
        const result = await ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] }],
          config: { responseMimeType: "application/json" },
        });
        const text = result.text?.trim();
        if (!text) throw new Error("Empty AI response");
        const parsed = JSON.parse(text);
        return res.json({ success: true, data: parsed });
      } catch (error) {
        lastError = error;
      }
    }

    console.error("All passport scan models failed:", lastError instanceof Error ? lastError.message : "unknown error");
    return res.status(502).json({ success: false, error: "Passport scanning failed. Please retry or review the passport manually." });
  } catch (error) {
    console.error("Passport scan error:", error instanceof Error ? error.message : "unknown error");
    return res.status(500).json({ success: false, error: "Passport scanning failed" });
  }
});

const publicDir = path.join(__dirname, "public");
const distDir = path.join(__dirname, "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
}
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ success: false, error: "Not found" });
  const indexPath = path.join(distDir, "index.html");
  if (existsSync(indexPath)) return res.sendFile(indexPath);
  return res.status(404).send("Not found");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Shuayb Recruitment API listening on port ${PORT}`);
});