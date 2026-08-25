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

// Initialize Firebase App safely (singleton)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with Google Sheets & Drive Scopes
export const provider = new GoogleAuthProvider();
export const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive"
];

WORKSPACE_SCOPES.forEach(scope => {
  provider.addScope(scope);
});

// Flag to track sign-in in progress
let isSigningIn = false;
// In-memory cache for OAuth access token (strictly NOT in localStorage)
let cachedAccessToken: string | null = null;

export interface AuthUserInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/**
 * Initialize auth listener on application boot.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Access token is only available on explicit sign-in or prompt in client-side OAuth
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Trigger Google Sign In popup requesting Workspace scopes
 */
export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error("لم يتم الحصول على تصريح الوصول من حساب Google.");
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
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

/**
 * Retrieve the active in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Set token in memory (e.g. after interactive login)
 */
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

/**
 * Sign out and clear in-memory token
 */
export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
