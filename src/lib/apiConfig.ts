/// <reference types="vite/client" />
import { Capacitor } from "@capacitor/core";

/**
 * Returns the base URL for backend API requests.
 * In Web mode, relative path "/api/..." works directly with the local Express server.
 * In Android Capacitor mode, if a remote server URL is defined in VITE_API_BASE_URL, it uses that.
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "");
  }

  // If on native Android and no custom URL configured, route to the cloud backend server
  if (Capacitor.isNativePlatform()) {
    return "https://ais-dev-lcyhq5hqe53iw7xy4xblqz-343361401430.europe-west2.run.app";
  }

  return "";
}

/**
 * Construct full URL for an API endpoint
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${cleanEndpoint}`;
}
