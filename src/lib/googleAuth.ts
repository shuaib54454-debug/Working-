import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const OWNER_EMAIL = "shuaib54454@gmail.com";
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const provider = new GoogleAuthProvider();
export const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar.events"
];
WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export interface AuthUserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const email = user.email?.trim().toLowerCase() || "";
      if (email !== OWNER_EMAIL) {
        cachedAccessToken = null;
        await signOut(auth).catch(() => {});
        if (onAuthFailure) onAuthFailure();
        return;
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email?.trim().toLowerCase() || "";
    if (email !== OWNER_EMAIL) {
      await signOut(auth).catch(() => {});
      throw new Error("هذا الحساب غير مصرح له بالدخول. استخدم حساب المالك فقط.");
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken || "" };
  } catch (error: any) {
    console.error("Google Sign-in error:", error);
    if (error?.code === "auth/unauthorized-domain" || error?.message?.includes("auth/unauthorized-domain")) {
      const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
      const customErr: any = new Error(
        `النطاق الحالي (${currentHost || "هذا النطاق"}) غير مدرج ضمن النطاقات المصرح بها في إعدادات Firebase Console.`
      );
      customErr.code = "auth/unauthorized-domain";
      customErr.domain = currentHost;
      throw customErr;
    }
    if (error?.code === "auth/popup-closed-by-user") {
      throw new Error("تم إغلاق نافذة تسجيل الدخول من قِبل المستخدم قبل إتمام العملية.");
    }
    if (error?.code === "auth/popup-blocked") {
      throw new Error("قام المتصفح بحظر النافذة المنبثقة لتسجيل الدخول. يرجى السماح بالنوافذ المنبثقة.");
    }
    if (error?.code === "auth/network-request-failed") {
      throw new Error("تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.");
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => cachedAccessToken;
export const setCachedAccessToken = (token: string | null) => { cachedAccessToken = token; };
export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
