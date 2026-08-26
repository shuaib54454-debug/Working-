/// <reference types="vite/client" />
import { Capacitor } from "@capacitor/core";
import { auth } from "./firebase";

// Primary and Secondary Cloud Backend Server URLs
export const CLOUD_BACKEND_URLS = [
  "https://ais-pre-lcyhq5hqe53iw7xy4xblqz-343361401430.europe-west2.run.app",
  "https://ais-dev-lcyhq5hqe53iw7xy4xblqz-343361401430.europe-west2.run.app"
];

/**
 * Returns the primary base URL for backend API requests.
 * In Web & PWA mode, relative path "/api/..." is used so it directly hits the same origin.
 * In Android Capacitor mode, it uses the remote HTTPS Cloud Run backend.
 */
export function getApiBaseUrl(): string {
  // 1. User/App configured custom override
  try {
    const customUrl = localStorage.getItem("SHUAYB_API_BASE_URL");
    if (customUrl && customUrl.trim().startsWith("http")) {
      return customUrl.trim().replace(/\/$/, "");
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // 2. Vite environment variable if provided during build
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().startsWith("http")) {
    return envUrl.trim().replace(/\/$/, "");
  }

  // 3. Native Android / iOS Capacitor or localhost origin
  const isCapacitor = Capacitor.isNativePlatform() || 
    (typeof window !== "undefined" && (
      window.location.protocol === "capacitor:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ));

  if (isCapacitor) {
    return CLOUD_BACKEND_URLS[0];
  }

  // 4. Default for Web browser / PWA (same-origin relative path)
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
 * Robust JSON POST API call with automatic fallback across Cloud Backend domains for Android APK
 */
export async function postJsonToApi<T = any>(
  endpoint: string,
  payload: any,
  timeoutMs: number = 30000
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  // Prepare headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  // Attach Firebase Auth ID Token if user is logged in
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

  // Determine candidate URLs to try
  const isNative = Capacitor.isNativePlatform() || 
    (typeof window !== "undefined" && (
      window.location.protocol === "capacitor:" ||
      window.location.hostname === "localhost"
    ));

  const candidateBases = isNative
    ? [getApiBaseUrl(), ...CLOUD_BACKEND_URLS.filter(u => u !== getApiBaseUrl())]
    : [getApiBaseUrl()];

  let lastErrorMsg = "Failed to connect to backend server";
  let lastStatus = 0;

  for (const base of candidateBases) {
    const fullUrl = getApiUrl(endpoint, base);
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
      lastStatus = response.status;

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
        lastErrorMsg = errJson?.error || `Server responded with HTTP ${response.status}`;
        console.warn(`API request to ${fullUrl} returned status ${response.status}:`, lastErrorMsg);
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr?.name === "AbortError") {
        lastErrorMsg = "انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.";
      } else {
        lastErrorMsg = fetchErr?.message || "تعذر الاتصال بالخادم";
      }
      console.warn(`API request to ${fullUrl} failed:`, fetchErr);
    }
  }

  return { success: false, error: lastErrorMsg, status: lastStatus };
}
