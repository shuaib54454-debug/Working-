/// <reference types="vite/client" />
import { Capacitor } from "@capacitor/core";
import { auth } from "./firebase";

/**
 * Cloud Run Production / Live Applet Backend URLs.
 * These are intentionally fixed in application code; authenticated API
 * requests must never be redirected to an arbitrary URL from localStorage.
 */
export const CLOUD_RUN_DEV_BACKEND = "https://ais-dev-lcyhq5hqe53iw7xy4xblqz-343361401430.europe-west2.run.app";
export const CLOUD_RUN_PRE_BACKEND = "https://ais-pre-lcyhq5hqe53iw7xy4xblqz-343361401430.europe-west2.run.app";
export const DEFAULT_PRODUCTION_BACKEND = CLOUD_RUN_DEV_BACKEND;

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

  // Same-origin backend is valid when the web app and API are deployed together.
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin;
    const isLocalhost =
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      window.location.protocol.startsWith("capacitor") ||
      window.location.protocol.startsWith("file");

    if (!isLocalhost && origin.startsWith("http")) {
      candidates.push(origin.replace(/\/$/, ""));
    }
  }

  // Native Capacitor builds use the fixed Cloud Run endpoints.
  const isCapacitor =
    Capacitor.isNativePlatform() ||
    (typeof window !== "undefined" &&
      (window.location?.protocol === "capacitor:" ||
        window.location?.origin?.includes("localhost") ||
        window.location?.protocol === "file:"));

  if (isCapacitor) {
    candidates.push(CLOUD_RUN_DEV_BACKEND);
    candidates.push(CLOUD_RUN_PRE_BACKEND);
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
