import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createGzip } from "node:zlib";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";
import https from "node:https";

const gzip = promisify(createGzip);
const PROJECT_ID = "crack-petal-506818-c8";
const SITE_ID = "crack-petal-506818-c8";
const DIST = path.resolve("dist");

function accessToken() {
  return execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
}

function request(url, { method = "GET", token, body, contentType = "application/json" } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(u, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": contentType, "Content-Length": Buffer.byteLength(body) } : {}),
      },
    }, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let data = text;
        try { data = JSON.parse(text); } catch {}
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode} ${method} ${url}: ${text.slice(0, 4000)}`));
          return;
        }
        resolve(data);
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}

async function main() {
  const token = accessToken();
  if (!token) throw new Error("Unable to obtain a Google access token from the configured service account.");

  await request(`https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}`, { token }).catch(async () => {
    await request(`https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}`, { token });
  });

  const sites = await request(`https://firebasehosting.googleapis.com/v1beta1/projects/${PROJECT_ID}/sites`, { token });
  const siteExists = (sites.sites || []).some(s => s.name === `projects/${PROJECT_ID}/sites/${SITE_ID}`);
  if (!siteExists) {
    console.log("Creating Firebase Hosting default site...");
    await request(`https://firebasehosting.googleapis.com/v1beta1/projects/${PROJECT_ID}/sites?siteId=${SITE_ID}`, {
      method: "POST", token, body: "{}"
    });
  } else {
    console.log("Firebase Hosting default site already exists.");
  }

  const version = await request(`https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/versions`, {
    method: "POST",
    token,
    body: JSON.stringify({
      config: {
        rewrites: [{ glob: "**", path: "/index.html" }],
        headers: [{
          glob: "**/*.@(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2)",
          headers: { "Cache-Control": "public,max-age=31536000,immutable" }
        }]
      }
    })
  });

  const versionName = version.name;
  const versionId = versionName.split("/").pop();
  const files = await walk(DIST);
  const entries = [];
  const compressed = new Map();

  for (const file of files) {
    const relative = "/" + path.relative(DIST, file).split(path.sep).join("/");
    const raw = await fs.readFile(file);
    const gz = await gzip(raw);
    const hash = createHash("sha256").update(gz).digest("hex");
    entries.push([relative, hash]);
    compressed.set(hash, gz);
  }

  for (let i = 0; i < entries.length; i += 1000) {
    const chunk = Object.fromEntries(entries.slice(i, i + 1000));
    const populated = await request(
      `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/versions/${versionId}:populateFiles`,
      { method: "POST", token, body: JSON.stringify({ files: chunk }) }
    );
    const required = populated.uploadRequiredHashes || [];
    console.log(`Files registered: ${Math.min(i + 1000, entries.length)}/${entries.length}; upload required: ${required.length}`);
    for (const hash of required) {
      const data = compressed.get(hash);
      if (!data) throw new Error(`Missing compressed file for hash ${hash}`);
      await request(
        `https://upload-firebasehosting.googleapis.com/upload/sites/${SITE_ID}/versions/${versionId}/files/${hash}`,
        { method: "POST", token, body: data, contentType: "application/octet-stream" }
      );
    }
  }

  await request(
    `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/versions/${versionId}?updateMask=status`,
    { method: "PATCH", token, body: JSON.stringify({ status: "FINALIZED" }) }
  );

  await request(
    `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}/releases?versionName=${encodeURIComponent(versionName)}`,
    { method: "POST", token }
  );

  console.log(`DEPLOYED_URL=https://${SITE_ID}.web.app`);
}

main().catch(err => {
  console.error(err.stack || err);
  process.exit(1);
});
