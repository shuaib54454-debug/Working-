/// <reference types="vite/client" />
import { Capacitor } from "@capacitor/core";
import { auth } from "./firebase";

/**
 * Default Dedicated Production Cloud Run Backend URL
 * This is built directly into the client code so no manual entry is required.
 */
export const DEFAULT_PRODUCTION_BACKEND = "https://ais-pre-lcyhq5hqe53iw7xy4xblqz-343361401430.europe-west2.run.app";

/**
 * Returns the active base URL for backend API requests.
 * 1. Vite VITE_API_BASE_URL build-time environment variable if configured
 * 2. Dedicated Production Backend URL when running inside Native Android Capacitor APK
 * 3. Empty string ("") for standard Web browser sessions (uses same-origin relative URLs)
 */
export function getApiBaseUrl(): string {
  // 1. Build-time environment variable override
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().startsWith("http")) {
    return envUrl.trim().replace(/\/$/, "");
  }

  // 2. Native Android / iOS Capacitor or localhost origin
  const isCapacitor =
    Capacitor.isNativePlatform() ||
    (typeof window !== "undefined" &&
      (window.location.protocol === "capacitor:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"));

  if (isCapacitor) {
    return DEFAULT_PRODUCTION_BACKEND;
  }

  // 3. Default for Web browser / PWA (same-origin relative path)
  return "";
}

/**
 * Construct full URL for an API endpoint
 */
export function getApiUrl(endpoint: string, baseUrlOverride?: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const base = baseUrlOverride !== undefined ? baseUrlOverride : getApiBaseUrl();
  return `${base}${cleanEndpoint}`;
}

/**
 * Robust JSON POST API call with Firebase Auth ID Token to Backend Server
 */
export async function postJsonToApi<T = any>(
  endpoint: string,
  payload: any,
  timeoutMs: number = 35000
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const fullUrl = getApiUrl(endpoint);

  // Prepare standard HTTPS JSON headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  // Attach Firebase Auth ID Token to authenticate this private request
  if (auth?.currentUser) {
    try {
      const idToken = await auth.currentUser.getIdToken(false);
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }
    } catch (tokenErr) {
      console.warn("Could not retrieve Firebase ID token for API request:", tokenErr);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
    } else {
      let errJson: any = null;
      try {
        errJson = await response.json();
      } catch {
        // ignore non-json response
      }
      const errorMsg =
        errJson?.error ||
        `استجاب الخادم برمز الحالة ${response.status} (${response.statusText || "خطأ"})`;
      console.warn(`API request to ${fullUrl} returned status ${response.status}:`, errorMsg);
      return { success: false, error: errorMsg, status: response.status };
    }
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    let errorMsg = "تعذر الاتصال بخادم الواجهة الخلفية";
    if (fetchErr?.name === "AbortError") {
      errorMsg = "انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.";
    } else if (fetchErr?.message) {
      errorMsg = fetchErr.message;
    }
    console.warn(`API request to ${fullUrl} failed:`, fetchErr);
    return { success: false, error: errorMsg, status: 0 };
  }
}
