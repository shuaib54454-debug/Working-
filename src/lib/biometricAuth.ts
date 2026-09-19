import { Capacitor } from "@capacitor/core";
import { BiometricAuth, BiometryType } from "@aparajita/capacitor-biometric-auth";
import { AppSecuritySettings } from "../types";

const SECURITY_STORAGE_KEY = "shuayb_security_lock_config";
const SECURITY_LOCK_STATE_KEY = "shuayb_security_is_locked";
const SECURITY_LAST_ACTIVE_KEY = "shuayb_security_last_active";

export const DEFAULT_SECURITY_SETTINGS: AppSecuritySettings = {
  enabled: false,
  pinCode: "",
  biometricEnabled: true,
  autoLockMinutes: 5,
};

/**
 * Reads security settings from local storage
 */
export function getSecuritySettings(): AppSecuritySettings {
  if (typeof window === "undefined") return DEFAULT_SECURITY_SETTINGS;
  try {
    const raw = localStorage.getItem(SECURITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SECURITY_SETTINGS,
        ...parsed,
      };
    }
  } catch (err) {
    console.error("Failed to parse security settings:", err);
  }
  return DEFAULT_SECURITY_SETTINGS;
}

/**
 * Saves security settings
 */
export function saveSecuritySettings(settings: AppSecuritySettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error("Failed to save security settings:", err);
  }
}

/**
 * Checks if biometric hardware/software is available on the device
 */
export async function checkBiometricSupport(): Promise<{
  available: boolean;
  biometryType: string;
  isNative: boolean;
  details?: string;
}> {
  const isNative = Capacitor.isNativePlatform();

  // 1. Try Native Capacitor Biometric Auth
  try {
    if (BiometricAuth && typeof BiometricAuth.checkBiometry === "function") {
      const info = await BiometricAuth.checkBiometry();
      if (info && info.isAvailable) {
        let typeStr = "بصمة الإصبع أو الوجه";
        if (info.biometryType === BiometryType.faceId || info.biometryType === BiometryType.faceAuthentication) {
          typeStr = "التعرف على الوجه (Face ID)";
        } else if (info.biometryType === BiometryType.fingerprintAuthentication || info.biometryType === BiometryType.touchId) {
          typeStr = "بصمة الإصبع (Fingerprint)";
        } else if (info.biometryType === BiometryType.irisAuthentication) {
          typeStr = "بصمة قزحية العين (Iris)";
        }
        return {
          available: true,
          biometryType: typeStr,
          isNative: true,
          details: `Capacitor Native Biometric (${typeStr})`
        };
      }
    }
  } catch (nativeErr) {
    console.warn("Native biometric check warning/bypass:", nativeErr);
  }

  // WebAuthn requires a registered credential and a real assertion ceremony.
  // This app does not maintain a WebAuthn credential store, so never report a
  // browser authenticator as successful without a cryptographic assertion.
  if (!isNative) {
    return {
      available: false,
      biometryType: "غير متاح في نسخة الويب",
      isNative: false,
      details: "Web biometric authentication is disabled until a real WebAuthn registration/assertion flow is configured."
    };
  }


  return {
    available: false,
    biometryType: "غير متاح بالجهاز",
    isNative,
    details: "لا يوجد حساس بيومتري مفعل"
  };
}

/**
 * Triggers biometric authentication (fingerprint / Face ID)
 */
export async function promptBiometricAuth(
  reason = "يرجى التحقق من بصمة الإصبع أو الوجه لفتح نظام وكالة شُعيب وحماية بيانات المرشحين"
): Promise<{ success: boolean; error?: string }> {
  // 1. Try Native Capacitor Biometric Auth
  try {
    if (BiometricAuth && typeof BiometricAuth.authenticate === "function") {
      await BiometricAuth.authenticate({
        reason,
        cancelTitle: "إلغاء",
        allowDeviceCredential: true,
        iosFallbackTitle: "استخدام رمز المرور",
      });
      return { success: true };
    }
  } catch (err: any) {
    console.warn("Capacitor biometric auth call failed or cancelled:", err);
    // If native cancelled or failed, return reason
    if (Capacitor.isNativePlatform()) {
      return {
        success: false,
        error: err?.message || "تم إلغاء المصادقة البيومترية أو لم تكتمل بنجاح"
      };
    }
  }

  // Do not simulate WebAuthn. Without a registered credential and
  // navigator.credentials.get() assertion, success would be a security bypass.
  if (!Capacitor.isNativePlatform()) {
    return {
      success: false,
      error: "التحقق البيومتري عبر الويب غير مفعّل حالياً. استخدم PIN أو تطبيق Android الأصلي."
    };
  }


  return {
    success: false,
    error: "تعذر التحقق البيومتري. يرجى إدخال رمز PIN للمتابعة."
  };
}

/**
 * Sets new PIN
 */
export function setPinCode(pin: string, enableBiometric = true, autoLockMinutes = 5): void {
  const current = getSecuritySettings();
  saveSecuritySettings({
    ...current,
    enabled: true,
    pinCode: pin,
    biometricEnabled: enableBiometric,
    autoLockMinutes,
  });
  setAppLockedState(false);
}

/**
 * Verifies entered PIN against saved PIN
 */
export function verifyPinCode(enteredPin: string): boolean {
  const settings = getSecuritySettings();
  if (!settings.enabled || !settings.pinCode) {
    return true; // No PIN configured
  }
  return settings.pinCode.trim() === enteredPin.trim();
}

/**
 * Disables PIN and biometric security lock
 */
export function disableSecurityLock(): void {
  const current = getSecuritySettings();
  saveSecuritySettings({
    ...current,
    enabled: false,
    pinCode: "",
  });
  setAppLockedState(false);
}

/**
 * Returns whether the app is currently in a locked state
 */
export function getAppLockedState(): boolean {
  const settings = getSecuritySettings();
  if (!settings.enabled || !settings.pinCode) return false;
  if (typeof window === "undefined") return false;
  
  // Check session lock state
  const sessionLock = sessionStorage.getItem(SECURITY_LOCK_STATE_KEY);
  if (sessionLock === "true") return true;

  // Check timeout from last active
  if (shouldAutoLock()) {
    setAppLockedState(true);
    return true;
  }

  return false;
}

/**
 * Explicitly sets app locked state
 */
export function setAppLockedState(locked: boolean): void {
  if (typeof window === "undefined") return;
  if (locked) {
    sessionStorage.setItem(SECURITY_LOCK_STATE_KEY, "true");
  } else {
    sessionStorage.removeItem(SECURITY_LOCK_STATE_KEY);
    updateLastActiveTime();
  }
}

/**
 * Updates last active timestamp
 */
export function updateLastActiveTime(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SECURITY_LAST_ACTIVE_KEY, Date.now().toString());
  } catch {}
}

export const updateLastActiveTimestamp = updateLastActiveTime;

/**
 * Calculates whether the inactivity timeout has passed
 */
export function shouldAutoLock(): boolean {
  const settings = getSecuritySettings();
  if (!settings.enabled || !settings.pinCode) return false;
  if (settings.autoLockMinutes === 0) return true; // Immediately lock on reopen

  if (typeof window === "undefined") return false;
  try {
    const raw = sessionStorage.getItem(SECURITY_LAST_ACTIVE_KEY);
    if (!raw) return true; // first time in session
    const lastActive = parseInt(raw, 10);
    if (isNaN(lastActive)) return true;

    const diffMinutes = (Date.now() - lastActive) / (1000 * 60);
    return diffMinutes >= settings.autoLockMinutes;
  } catch {
    return true;
  }
}
