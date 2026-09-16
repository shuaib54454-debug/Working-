import { STORAGE_KEYS } from "../data/initialData";

/**
 * Legacy sensitive cache keys. These values may contain candidate/passport,
 * financial, or audit data and must not be persisted again after migration.
 */
export const SENSITIVE_LOCAL_STORAGE_KEYS = [
  STORAGE_KEYS.candidates,
  STORAGE_KEYS.expenses,
  STORAGE_KEYS.settings,
  STORAGE_KEYS.activities
] as const;

export function clearSensitiveLocalCache(): void {
  if (typeof window === "undefined") return;
  for (const key of SENSITIVE_LOCAL_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable or restricted; never block app startup.
    }
  }
}

export function hasSensitiveLocalCache(): boolean {
  if (typeof window === "undefined") return false;
  return SENSITIVE_LOCAL_STORAGE_KEYS.some(key => {
    try {
      return window.localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  });
}
