/// <reference types="vite/client" />
import { Capacitor } from "@capacitor/core";
import { auth } from "./firebase";

/**
 * Render Production Backend URL.
 * These are intentionally fixed in application code; authenticated API
 * requests must never be redirected to an arbitrary URL from localStorage.
 */
export const RENDER_BACKEND = "https://working-tkge.onrender.com";
export const DEFAULT_PRODUCTION_BACKEND = RENDER_BACKEND;

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https:\/\//i.test(value.trim());
}

/**
 * Returns only application-controlled backend URLs in priority order.
 * A browser/localStorage value is deliberately never trusted as an API host.
 */
export function getCandidateBackendUrls(): string[] {
  const candidates: string[] = [];

  // Build-time configuration is controlled by the application deployment.
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (isHttpUrl(envUrl)) {
    candidates.push(envUrl.trim().replace(/\/$/, ""));
  }

  const isCapacitor =
    Capacitor.isNativePlatform() ||
    (typeof window !== "undefined" &&
      (window.location?.protocol === "capacitor:" ||
        window.location?.origin?.includes("localhost") ||
        window.location?.protocol === "file:"));

  const isBrowserProduction =
    typeof window !== "undefined" &&
    window.location?.protocol.startsWith("http") &&
    !window.location?.origin?.includes("localhost") &&
    !window.location?.origin?.includes("127.0.0.1");

  // Production web and native clients use the fixed, application-controlled
  // Render backend. This is critical for Firebase Hosting: Hosting serves
  // the SPA statically, so /api/* is not a backend route there.
  if (isBrowserProduction || isCapacitor) {
    candidates.push(RENDER_BACKEND);
  }

  // Local development keeps the API same-origin because server.ts hosts both
  // Vite and the Express API locally.
  if (!isBrowserProduction && typeof window !== "undefined" && window.location?.origin) {
    candidates.push(window.location.origin.replace(/\/$/, ""));
  }

  // Relative path is the final same-origin fallback.
  candidates.push("");

  return Array.from(new Set(candidates));
}

export function getApiBaseUrl(): string {
  return getCandidateBackendUrls()[0] ?? "";
}

/**
 * Legacy compatibility API. Arbitrary runtime backend overrides are disabled
 * because they could redirect authenticated requests to an untrusted server.
 */
export function setCustomBackendUrl(_url: string | null): void {
  // Intentionally no-op. Backend destinations are application-controlled.
}

export function getApiUrl(endpoint: string, baseUrlOverride?: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const base = baseUrlOverride !== undefined ? baseUrlOverride : getApiBaseUrl();
  return `${base}${cleanEndpoint}`;
}

/**
 * Robust JSON POST API call with Firebase Auth ID Token authentication.
 */
export async function postJsonToApi<T = any>(
  endpoint: string,
  payload: any,
  timeoutMs: number = 35000
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const candidateUrls = getCandidateBackendUrls();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  // Private backend requests require a real Firebase ID token.
  if (!auth?.currentUser) {
    return { success: false, error: "يجب تسجيل الدخول بحساب المالك أولاً.", status: 401 };
  }

  try {
    const idToken = await auth.currentUser.getIdToken(false);
    if (!idToken) {
      return { success: false, error: "تعذر الحصول على رمز المصادقة.", status: 401 };
    }
    headers["Authorization"] = `Bearer ${idToken}`;
  } catch {
    return { success: false, error: "تعذر الحصول على رمز المصادقة.", status: 401 };
  }

  let lastErrorMsg = "تعذر الاتصال بخادم الواجهة الخلفية";
  let lastStatus = 0;

  for (let i = 0; i < candidateUrls.length; i++) {
    const base = candidateUrls[i];
    const fullUrl = `${base}${cleanEndpoint}`;
    const controller = new AbortController();
    const activeTimeout = i === 0 ? timeoutMs : Math.min(timeoutMs, 20000);
    const timeoutId = setTimeout(() => controller.abort(), activeTimeout);

    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        return { success: true, data: json, status: response.status };
      }

      let errJson: any = null;
      try {
        errJson = await response.json();
      } catch {
        // Ignore non-JSON error responses.
      }

      const errorMsg =
        errJson?.error ||
        `استجاب الخادم برمز الحالة ${response.status} (${response.statusText || "خطأ"})`;
      lastErrorMsg = errorMsg;
      lastStatus = response.status;

      // Client/authentication failures are deterministic; do not send the
      // same authenticated request to another endpoint after a 4xx response.
      if (response.status >= 400 && response.status < 500) {
        return { success: false, error: errorMsg, status: response.status };
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr?.name === "AbortError") {
        lastErrorMsg = "انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.";
      } else if (fetchErr?.message) {
        lastErrorMsg = fetchErr.message;
      }
      // Do not log tokens, payloads, or full backend configuration.
      console.warn(`API attempt ${i + 1}/${candidateUrls.length} failed:`, fetchErr?.message || fetchErr);
    }
  }

  return { success: false, error: lastErrorMsg, status: lastStatus };
}
