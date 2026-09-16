import { Capacitor } from "@capacitor/core";
import { BiometryType, NativeBiometric } from "@capgo/capacitor-native-biometric";

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
    const result = await NativeBiometric.isAvailable({ useFallback: true });
    return Boolean(result.isAvailable);
  } catch {
    return false;
  }
}

export async function authenticateToUnlock(): Promise<boolean> {
  if (!isNativeApp()) return true;

  try {
    await NativeBiometric.verifyIdentity({
      reason: "افتح التطبيق للوصول إلى بيانات المرشحين",
      title: "فتح تطبيق شعيب",
      subtitle: "التحقق من هوية مستخدم الجهاز",
      description: "استخدم البصمة أو رمز PIN/قفل الجهاز للمتابعة.",
      allowedBiometryTypes: [
        BiometryType.FINGERPRINT,
        BiometryType.FACE_AUTHENTICATION,
        BiometryType.IRIS_AUTHENTICATION,
        BiometryType.DEVICE_CREDENTIAL
      ],
      maxAttempts: 5
    });
    return true;
  } catch {
    return false;
  }
}
