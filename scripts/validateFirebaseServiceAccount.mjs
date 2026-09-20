import fs from "node:fs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error("Usage: node validateFirebaseServiceAccount.mjs <input> <output>");
}

const raw = fs.readFileSync(inputPath, "utf8").trim();
if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is empty.");

let parsed;
for (const candidate of [raw, (() => { try { return Buffer.from(raw, "base64").toString("utf8").trim(); } catch { return ""; } })()]) {
  if (!candidate) continue;
  try {
    parsed = JSON.parse(candidate);
    break;
  } catch {}
}

if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is not valid JSON or base64-encoded JSON. Paste the complete Google Cloud service-account JSON into the GitHub secret.");
}

const required = ["type", "project_id", "private_key", "client_email"];
const missing = required.filter((key) => typeof parsed[key] !== "string" || !parsed[key].trim());
if (missing.length) {
  throw new Error("Service-account JSON is missing required fields: " + missing.join(", "));
}
if (parsed.type !== "service_account") {
  throw new Error("The credential is not a Google service-account key.");
}
if (!parsed.private_key.includes("BEGIN PRIVATE KEY")) {
  throw new Error("The service-account private_key field is invalid or incomplete.");
}

fs.writeFileSync(outputPath, JSON.stringify(parsed));
console.log("Firebase service-account credential validated.");
