/// <reference types="vite/client" />
import { Capacitor } from "@capacitor/core";
import { auth } from "./firebase";

/**
 * Cloud Run Production / Live Applet Backend URLs
 */
export const CLOUD_RUN_DEV_BACKEND = "https://ais-dev-lcyhq5hqe53iw7xy4xblqz-343361401430.europe-west2.run.app";
export const CLOUD_RUN_PRE_BACKEND = "https://ais-pre-lcyhq5hqe53iw7xy4xblqz-343361401430.europe-west2.run.app";
export const DEFAULT_PRODUCTION_BACKEND = CLOUD_RUN_DEV_BACKEND;

/**
 * Returns candidate base URLs in priority order for maximum resilience.
 */
export function getCandidateBackendUrls(): string[] {
  const candidates: string[] = [];

  // 1. User/Admin explicit custom override stored locally
  if (typeof window !== "undefined") {
    try {
      const customUrl =
        localStorage.getItem("shuayb_custom_backend_url") ||
        localStorage.getItem("shuayb_backend_url");
      if (customUrl && typeof customUrl === "string" && customUrl.trim().startsWith("http")) {
        candidates.push(customUrl.trim().replace(/\/$/, ""));
      }
    } catch {}
  }

  // 2. Build-time environment variable override (VITE_API_BASE_URL)
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().startsWith("http")) {
    candidates.push(envUrl.trim().replace(/\/$/, ""));
  }

  // 3. Dynamic current origin (when loaded in browser or WebView pointing to a live domain)
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

  // 4. In native Capacitor or standalone APK running on localhost/capacitor scheme
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

  // 5. Always include relative path (empty string) for same-origin web requests
  candidates.push("");

  // Remove duplicates while preserving order
  return Array.from(new Set(candidates));
}

/**
 * Returns the primary active base URL for backend API requests.
 */
export function getApiBaseUrl(): string {
  const candidates = getCandidateBackendUrls();
  return candidates[0] ?? "";
}

/**
 * Set a custom backend URL dynamically (stored in localStorage)
 */
export function setCustomBackendUrl(url: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (url && url.trim().startsWith("http")) {
      localStorage.setItem("shuayb_custom_backend_url", url.trim().replace(/\/$/, ""));
    } else {
      localStorage.removeItem("shuayb_custom_backend_url");
      localStorage.removeItem("shuayb_backend_url");
    }
  } catch {}
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
 * Robust JSON POST API call with multi-candidate fallback & Firebase Auth ID Token to Backend Server
 */
export async function postJsonToApi<T = any>(
  endpoint: string,
  payload: any,
  timeoutMs: number = 35000
): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const candidateUrls = getCandidateBackendUrls();

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
  } else if (typeof window !== "undefined") {
    const localUserRaw = localStorage.getItem("shuayb_local_user");
    if (localUserRaw) {
      try {
        const localUser = JSON.parse(localUserRaw);
        if (localUser?.uid) {
          headers["Authorization"] = `Bearer local-mode-user:${encodeURIComponent(localUser.uid)}:${encodeURIComponent(localUser.email || "")}`;
        }
      } catch {}
    }
  }

  // Fallback authorization header for guest or preview applet sessions
  if (!headers["Authorization"]) {
    headers["Authorization"] = "Bearer applet-agency-session";
  }

  let lastErrorMsg = "تعذر الاتصال بخادم الواجهة الخلفية";
  let lastStatus = 0;

  // Try each candidate URL until one succeeds
  for (let i = 0; i < candidateUrls.length; i++) {
    const base = candidateUrls[i];
    const fullUrl = `${base}${cleanEndpoint}`;
    const controller = new AbortController();
    // Allow ample time for multimodal vision processing on first attempt, slightly shorter on secondary fallbacks
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
        lastErrorMsg = errorMsg;
        lastStatus = response.status;
        // If it's a 4xx client error (e.g. 400 bad image or 401 unauthorized), don't retry other servers
        if (response.status >= 400 && response.status < 500) {
          return { success: false, error: errorMsg, status: response.status };
        }
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr?.name === "AbortError") {
        lastErrorMsg = "انتهت مهلة الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.";
      } else if (fetchErr?.message) {
        lastErrorMsg = fetchErr.message;
      }
      console.warn(`API attempt ${i + 1}/${candidateUrls.length} to ${fullUrl} failed:`, fetchErr);
    }
  }

  return { success: false, error: lastErrorMsg, status: lastStatus };
}
