import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";

export const APP_LOCK_STORAGE_KEY = "shuayb_app_lock_enabled";
export const APP_LOCK_CHANGED_EVENT = "shuayb:app-lock-changed";

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export function isAppLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(APP_LOCK_STORAGE_KEY) === "true";
}

export function setAppLockEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  if (enabled) {
    localStorage.setItem(APP_LOCK_STORAGE_KEY, "true");
  } else {
    localStorage.removeItem(APP_LOCK_STORAGE_KEY);
  }
  window.dispatchEvent(new Event(APP_LOCK_CHANGED_EVENT));
}

export async function canUseDeviceAuthentication(): Promise<boolean> {
  if (!isNativeApp()) return false;

  try {
    const result = await BiometricAuth.checkBiometry();
    return Boolean(result.isAvailable || result.deviceIsSecure);
  } catch {
    return false;
  }
}

export async function authenticateToUnlock(): Promise<boolean> {
  if (!isNativeApp()) return true;

  try {
    await BiometricAuth.authenticate({
      reason: "افتح التطبيق للوصول إلى بيانات المرشحين",
      androidTitle: "فتح تطبيق شعيب",
      androidSubtitle: "التحقق من هوية مستخدم الجهاز",
      allowDeviceCredential: true,
      cancelTitle: "إلغاء",
    });
    return true;
  } catch {
    return false;
  }
}
