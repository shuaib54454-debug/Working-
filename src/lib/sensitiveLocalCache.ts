import { STORAGE_KEYS } from "../data/initialData";

/**
 * Legacy sensitive local cache bridge.
 * Candidate, financial, settings, and audit data must not remain in
 * persistent browser storage. Legacy values are captured once in memory,
 * removed from localStorage, and exposed only long enough for cloud migration.
 */
export const SENSITIVE_LOCAL_STORAGE_KEYS = [
  STORAGE_KEYS.candidates,
  STORAGE_KEYS.expenses,
  STORAGE_KEYS.settings,
  STORAGE_KEYS.activities
] as const;

type SensitiveKey = typeof SENSITIVE_LOCAL_STORAGE_KEYS[number];
const legacyValues = new Map<SensitiveKey, string>();
let initialized = false;

function isSensitiveKey(key: string): key is SensitiveKey {
  return (SENSITIVE_LOCAL_STORAGE_KEYS as readonly string[]).includes(key);
}

function captureLegacyValues(): void {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  for (const key of SENSITIVE_LOCAL_STORAGE_KEYS) {
    try {
      const value = window.localStorage.getItem(key);
      if (value !== null) legacyValues.set(key, value);
      window.localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable or restricted; never block app startup.
    }
  }
}

captureLegacyValues();

export function readLegacySensitiveValue(key: SensitiveKey): string | null {
  captureLegacyValues();
  return legacyValues.get(key) ?? null;
}

export function clearSensitiveLocalCache(): void {
  legacyValues.clear();
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
  captureLegacyValues();
  return legacyValues.size > 0;
}

// Defense-in-depth: legacy code in App.tsx still references these keys.
// Prevent it from recreating sensitive persistent storage while allowing its
// initial read to consume the one-time in-memory legacy value.
const originalSetItem = Storage.prototype.setItem;
const originalGetItem = Storage.prototype.getItem;
const originalRemoveItem = Storage.prototype.removeItem;

Storage.prototype.setItem = function (key: string, value: string): void {
  if (this === window.localStorage && isSensitiveKey(key)) return;
  originalSetItem.call(this, key, value);
};

Storage.prototype.getItem = function (key: string): string | null {
  if (this === window.localStorage && isSensitiveKey(key)) {
    captureLegacyValues();
    return legacyValues.get(key) ?? null;
  }
  return originalGetItem.call(this, key);
};

Storage.prototype.removeItem = function (key: string): void {
  if (this === window.localStorage && isSensitiveKey(key)) {
    legacyValues.delete(key);
    return;
  }
  originalRemoveItem.call(this, key);
};
