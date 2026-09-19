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
var import_genai = require("@google/genai");
var import_fs = require("fs");
var import_path = __toESM(require("path"), 1);
var import_auth = require("firebase-admin/auth");
var import_app = require("firebase-admin/app");
var rootDir = process.cwd();
var distPath = import_path.default.join(rootDir, "dist");
var publicPath = import_path.default.join(rootDir, "public");
var configPath = import_path.default.join(rootDir, "firebase-applet-config.json");
var app = (0, import_express.default)();
var PORT = Number.parseInt(process.env.PORT || "3000", 10);
var OWNER_EMAIL = String(process.env.OWNER_EMAIL || "shuaib54454@gmail.com").trim().toLowerCase();
var firebaseConfig = {};
try {
  if ((0, import_fs.existsSync)(configPath)) {
    firebaseConfig = JSON.parse((0, import_fs.readFileSync)(configPath, "utf-8"));
  }
} catch (error) {
  console.error("Failed to load Firebase config:", error instanceof Error ? error.message : "unknown error");
}
var PRIMARY_PROJECT_ID = String(firebaseConfig?.projectId || "");
var ALLOWED_PROJECT_IDS = new Set(
  [PRIMARY_PROJECT_ID, ...Array.isArray(firebaseConfig?.allowedProjectIds) ? firebaseConfig.allowedProjectIds : []].filter(Boolean).map(String)
);
var firebaseApps = /* @__PURE__ */ new Map();
function getFirebaseAuthForProject(projectId) {
  if (!ALLOWED_PROJECT_IDS.has(projectId)) throw new Error("Unauthorized Firebase project");
  let firebaseApp = firebaseApps.get(projectId);
  if (!firebaseApp) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured");
    const serviceAccount = JSON.parse(serviceAccountJson);
    if (String(serviceAccount.project_id || "") !== projectId) throw new Error("Firebase service account project mismatch");
    firebaseApp = (0, import_app.getApps)().find((candidate) => candidate.name === `auth-${projectId}`);
    if (!firebaseApp) firebaseApp = (0, import_app.initializeApp)({ credential: (0, import_app.cert)(serviceAccount), projectId }, `auth-${projectId}`);
    firebaseApps.set(projectId, firebaseApp);
  }
  return (0, import_auth.getAuth)(firebaseApp);
}
function getTokenProjectId(idToken) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed Firebase ID token");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
  const projectId = typeof payload?.aud === "string" ? payload.aud : "";
  if (!projectId || !ALLOWED_PROJECT_IDS.has(projectId)) throw new Error("Unauthorized Firebase project");
  return projectId;
}
async function verifyPassportScanAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ success: false, error: "Authentication required" });
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken === "guest" || idToken === "applet-agency-session" || idToken.startsWith("local-mode-user:")) {
    return res.status(401).json({ success: false, error: "A verified Firebase ID token is required" });
  }
  try {
    const projectId = getTokenProjectId(idToken);
    const decoded = await getFirebaseAuthForProject(projectId).verifyIdToken(idToken, true);
    const email = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : "";
    if (!email || email !== OWNER_EMAIL) return res.status(403).json({ success: false, error: "Owner account required" });
    req.user = decoded;
    return next();
  } catch (error) {
    console.warn("Passport scan authentication failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(401).json({ success: false, error: "Invalid or expired authentication token" });
  }
}
var geminiKey = process.env.GEMINI_API_KEY;
var ai = geminiKey ? new import_genai.GoogleGenAI({ apiKey: geminiKey }) : null;
var configuredOrigins = String(process.env.ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);
var allowedOrigins = /* @__PURE__ */ new Set([
  ...configuredOrigins,
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "http://localhost:3000",
  "https://localhost:3000"
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
app.use(import_express.default.json({ limit: "12mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "1mb" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.post("/api/scan-passport", verifyPassportScanAuth, async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body || {};
    const allowedMimeTypes = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
    if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
      return res.status(400).json({ success: false, error: "Valid passport image is required" });
    }
    if (!allowedMimeTypes.has(mimeType)) {
      return res.status(400).json({ success: false, error: "Unsupported image type" });
    }
    const rawBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(rawBase64) || rawBase64.length % 4 !== 0) {
      return res.status(400).json({ success: false, error: "Invalid image encoding" });
    }
    const estimatedBytes = Math.floor(rawBase64.length * 3 / 4);
    if (estimatedBytes > 8 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: "Passport image is too large" });
    }
    if (!ai) return res.status(503).json({ success: false, error: "Passport scanning service is not configured" });
    const prompt = `Analyze this passport image for OCR and MRZ data. Never invent, repair, synthesize, reconstruct, or guess any MRZ characters or passport fields. Return JSON only. Set overallStatus to VERIFIED only when a complete visible MRZ is present and all check digits/checksums validate. If the MRZ is missing, incomplete, unreadable, or invalid, return overallStatus as NEEDS_REVIEW and preserve uncertainty rather than fabricating values. Extract visible fields only: passportNumber, surname, givenNames, nationality, dateOfBirth, sex, dateOfExpiry, issuingCountry, mrz, and confidence.`;
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
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
        if (!text) throw new Error("Empty Gemini response");
        const parsed = JSON.parse(text);
        return res.json({ success: true, data: parsed, model });
      } catch (error) {
        lastError = error;
        console.warn(`Gemini passport scan failed for ${model}:`, error instanceof Error ? error.message : "unknown error");
      }
    }
    console.error("All Gemini passport scan models failed:", lastError instanceof Error ? lastError.message : "unknown error");
    return res.status(502).json({ success: false, error: "Passport scanning service failed" });
  } catch (error) {
    console.error("Passport scan request failed:", error instanceof Error ? error.message : "unknown error");
    return res.status(500).json({ success: false, error: "Passport scan request failed" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.get("/manifest.webmanifest", (_req, res) => {
      const distFile = import_path.default.join(distPath, "manifest.webmanifest");
      if ((0, import_fs.existsSync)(distFile)) return res.sendFile(distFile);
      return res.sendFile(import_path.default.join(publicPath, "manifest.webmanifest"));
    });
    app.get("/sw.js", (_req, res) => {
      const distFile = import_path.default.join(distPath, "sw.js");
      if ((0, import_fs.existsSync)(distFile)) return res.sendFile(distFile);
      return res.sendFile(import_path.default.join(publicPath, "sw.js"));
    });
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
