import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  UserCheck,
  Zap
} from "lucide-react";
import { loginWithEmail, registerOwnerAccount, resetUserPassword } from "../lib/firebase";
import { googleSignIn } from "../lib/googleAuth";
import { useLanguage } from "../lib/LanguageContext";
import { ShuaybLogo } from "./ShuaybLogo";

const OWNER_EMAIL = "shuaib54454@gmail.com";
const FIREBASE_CONSOLE_AUTH_URL = "https://console.firebase.google.com/project/crack-petal-506818-c8/authentication/providers";

interface LoginScreenProps {
  onSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { isAr, toggleLanguage } = useLanguage();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [showConsoleGuide, setShowConsoleGuide] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const rejectNonOwner = (value: string) => {
    if (value.trim().toLowerCase() !== OWNER_EMAIL) {
      throw new Error(
        isAr
          ? "هذا الحساب غير مصرح له. استخدم حساب المالك فقط (shuaib54454@gmail.com)."
          : "This account is not authorized. Use the owner account only (shuaib54454@gmail.com)."
      );
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsOperationNotAllowed(false);
    setIsUnauthorizedDomain(false);
    setSuccessMessage(null);
    setGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result?.user) {
        onSuccess();
      }
    } catch (err: any) {
      const code = err?.code || "";
      const msg = err?.message || "";
      if (code === "auth/unauthorized-domain" || msg.includes("auth/unauthorized-domain")) {
        console.warn("Google sign-in unauthorized domain:", err);
        setIsUnauthorizedDomain(true);
        setError(
          isAr
            ? `النطاق الحالي (${window.location.hostname}) غير مدرج ضمن النطاقات المصرح بها في Firebase. يرجى إضافته في إعدادات Firebase Console.`
            : `Current domain (${window.location.hostname}) is not added to Firebase Authorized Domains. Please add it in Firebase Console settings.`
        );
      } else if (code === "auth/popup-closed-by-user") {
        console.info("Google sign-in popup was closed by user.");
      } else {
        console.error("Google sign in error:", err);
        setError(msg || (isAr ? "فشل تسجيل الدخول بحساب Google" : "Google sign-in failed"));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsOperationNotAllowed(false);
    setIsUnauthorizedDomain(false);
    setSuccessMessage(null);
    setLoading(true);

    try {
      rejectNonOwner(email);

      if (mode === "login") {
        await loginWithEmail(email, password);
        onSuccess();
      } else if (mode === "register") {
        if (password.length < 6) {
          throw new Error(isAr ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
        }
        if (password !== confirmPassword) {
          throw new Error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
        }
        await registerOwnerAccount(email, password);
        setSuccessMessage(isAr ? "تم إنشاء وتفعيل حساب المالك بنجاح!" : "Owner account created successfully!");
        onSuccess();
      } else {
        await resetUserPassword(OWNER_EMAIL);
        setSuccessMessage(
          isAr
            ? "تم إرسال رابط استعادة كلمة المرور إلى بريد المالك (shuaib54454@gmail.com)."
            : "Password reset link sent to owner email (shuaib54454@gmail.com)."
        );
      }
    } catch (err: any) {
      const code = err?.code || "";
      const rawMsg = err?.message || "";

      if (code === "auth/operation-not-allowed" || rawMsg.includes("auth/operation-not-allowed")) {
        console.warn("Firebase Auth Notice: Email/Password provider is disabled in Firebase Console:", err);
        setIsOperationNotAllowed(true);
        setError(
          isAr
            ? "تسجيل الدخول بكلمة المرور غير مفعّل في لوحة Firebase Console. يرجى استخدام تسجيل الدخول السريع بحساب Google المعتمد أعلاه، أو تفعيل مزوّد Email/Password في Firebase."
            : "Email/Password sign-in provider is disabled in Firebase Console. Please use the verified Google Sign-In button above, or enable Email/Password in Firebase Console."
        );
      } else if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        rawMsg.includes("auth/invalid-credential")
      ) {
        console.warn("Firebase Auth credential validation failed:", code);
        setError(
          isAr
            ? "بيانات الدخول غير صحيحة، أو لم يتم إنشاء كلمة مرور لهذا الحساب بعد في Firebase. يمكنك الدخول فوراً عبر حساب Google المعتمد أو إنشاء كلمة مرور جديدة."
            : "Invalid credentials or password has not been created yet in Firebase. You can sign in with Google or create a password."
        );
      } else if (code === "auth/email-already-in-use" || rawMsg.includes("auth/email-already-in-use")) {
        setError(
          isAr
            ? "الحساب مسجل بالفعل في Firebase. يرجى استخدام تسجيل الدخول العادي."
            : "Account already exists in Firebase. Please use regular Sign In."
        );
      } else if (code === "auth/weak-password" || rawMsg.includes("auth/weak-password")) {
        setError(
          isAr
            ? "كلمة المرور ضعيفة جداً. يرجى استخدام 6 أحرف أو أرقام على الأقل."
            : "Password is too weak. Please use at least 6 characters."
        );
      } else if (code === "auth/invalid-email" || rawMsg.includes("auth/invalid-email")) {
        setError(isAr ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format");
      } else {
        console.error("Auth error:", err);
        setError(rawMsg || (isAr ? "حدث خطأ أثناء المصادقة" : "Authentication error occurred"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1d31] flex items-center justify-center p-4 text-stone-100" dir={isAr ? "rtl" : "ltr"}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-stone-800 border border-[#c9a84c]/20 relative">
        {/* Language switch button */}
        <div className="absolute top-5 end-5">
          <button
            type="button"
            onClick={toggleLanguage}
            className="px-3 py-1 text-xs font-bold rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600 transition-colors"
          >
            {isAr ? "English" : "العربية"}
          </button>
        </div>

        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <ShuaybLogo size="lg" variant="icon" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#172a46] tracking-tight">
            Shuayb Trade Bridge
          </h1>
          <p className="text-[11px] font-bold text-[#8B262A] mt-0.5">
            {isAr ? "وكالة شعيب للتوظيف والخدمات التجارية" : "Shuayb Agency Portal"}
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-stone-50 border border-stone-200 px-3.5 py-1 text-[11px] font-bold text-stone-600">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c9a84c]" />
            {isAr ? "حساب المالك المعتمد: shuaib54454@gmail.com" : "Owner account: shuaib54454@gmail.com"}
          </div>
        </div>

        {/* Operation Not Allowed / Error Resolution Card */}
        {isOperationNotAllowed && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isAr
                    ? "تسجيل الدخول بكلمة المرور (Email/Password) غير مفعّل في Firebase"
                    : "Email/Password sign-in provider is disabled in Firebase"}
                </p>
                <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                  {isAr
                    ? "مشروع Firebase مفعّل عليه الدخول بحساب Google فقط حالياً. يمكنك الدخول فوراً عبر Google أو تفعيل مزوّد كلمة المرور:"
                    : "Your Firebase project currently has Google Sign-in enabled. Sign in with Google now or enable the Email/Password provider:"}
                </p>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full py-2.5 px-3 bg-[#172a46] hover:bg-[#203a60] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                {googleLoading ? (isAr ? "جاري الدخول..." : "Signing in...") : (isAr ? "تسجيل الدخول الفوري بحساب Google (المعتمد)" : "Sign in with Google Now (Recommended)")}
              </button>
            </div>

            {/* How to enable email/password in console */}
            <div className="pt-2 border-t border-amber-200/60">
              <button
                type="button"
                onClick={() => setShowConsoleGuide(!showConsoleGuide)}
                className="text-[11px] font-bold text-amber-900 underline flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {isAr ? "خطوات تفعيل كلمة المرور من لوحة تحكم Firebase (سريعة):" : "How to enable Email/Password in Firebase Console:"}
              </button>

              {showConsoleGuide && (
                <div className="mt-2 p-2.5 bg-white/90 rounded-xl text-[11px] text-stone-700 leading-relaxed border border-amber-200 space-y-1.5">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      {isAr ? "افتح إعدادات مزودي الدخول في Firebase بالضغط هنا:" : "Open Firebase sign-in providers tab:"}{" "}
                      <a
                        href={FIREBASE_CONSOLE_AUTH_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#172a46] font-bold underline inline-flex items-center gap-0.5"
                      >
                        Firebase Console &rarr; Providers <ExternalLink className="w-2.5 h-2.5 inline" />
                      </a>
                    </li>
                    <li>{isAr ? "اضغط على مزوّد (Email/Password)." : "Click on (Email/Password) provider."}</li>
                    <li>{isAr ? "قم بتفعيل خيار (Enable) ثم اضغط (Save)." : "Toggle (Enable) to ON and click (Save)."}</li>
                  </ol>
                  <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-100">
                    {isAr ? "بمجرد حفظ التفعيل في Firebase، سيعمل تسجيل الدخول بكلمة المرور فوراً." : "Once enabled and saved, password sign-in will work immediately."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Standard Error Notice */}
        {error && !isOperationNotAllowed && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Success Notice */}
        {successMessage && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Primary Recommended Option: Google Sign-In */}
        {mode === "login" && (
          <div className="mb-5">
            <div className="rounded-2xl border-2 border-[#172a46]/15 bg-gradient-to-b from-[#172a46]/5 to-transparent p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {isAr ? "طريقة المصادقة السحابية المعتمدة والمفعّلة" : "Active & Verified Cloud Sign-In"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#172a46] hover:bg-[#203a60] text-white font-black text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 p-0.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <span>
                  {googleLoading
                    ? (isAr ? "جاري التحقق والاتصال..." : "Verifying & Connecting...")
                    : (isAr ? "دخول فوري بحساب Google المعتمد" : "Sign in with Google (Owner Account)")}
                </span>
              </button>
              <p className="text-[11px] text-stone-500 mt-2 font-medium">
                {isAr ? "دخول فوري بضغطة واحدة لحساب shuaib54454@gmail.com" : "Instant 1-click access for shuaib54454@gmail.com"}
              </p>
            </div>

            <div className="relative my-5 flex items-center justify-center">
              <div className="border-t border-stone-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-stone-400 shrink-0">
                {isAr ? "أو الدخول بكلمة المرور" : "Or sign in with password"}
              </span>
              <div className="border-t border-stone-200 w-full" />
            </div>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">
              {isAr ? "بريد حساب المالك" : "Owner Email"}
            </label>
            <div className="relative">
              <Mail className="absolute top-3.5 start-3.5 w-4 h-4 text-stone-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                className="w-full ps-10 pe-3 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                placeholder={OWNER_EMAIL}
                required
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">
                {mode === "register"
                  ? (isAr ? "تعيين كلمة المرور الجديدة" : "Set New Password")
                  : (isAr ? "كلمة المرور" : "Password")}
              </label>
              <div className="relative">
                <KeyRound className="absolute top-3.5 start-3.5 w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  className="w-full ps-10 pe-11 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  placeholder={mode === "register" ? "******" : ""}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute top-2.5 end-2.5 p-1.5 text-stone-400 hover:text-stone-600"
                  aria-label={isAr ? "إظهار كلمة المرور" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">
                {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
              </label>
              <div className="relative">
                <KeyRound className="absolute top-3.5 start-3.5 w-4 h-4 text-stone-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full ps-10 pe-3 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-sm font-semibold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                  placeholder="******"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
              mode === "login"
                ? "bg-stone-100 hover:bg-stone-200 text-[#172a46] border border-stone-300"
                : "bg-[#172a46] hover:bg-[#203a60] text-white font-black shadow-md"
            }`}
          >
            {mode === "login" ? (
              <LogIn className="w-4 h-4 text-[#172a46]" />
            ) : mode === "register" ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {loading
              ? (isAr ? "جاري المعالجة..." : "Processing...")
              : mode === "login"
              ? (isAr ? "دخول المالك بكلمة المرور" : "Sign In with Password")
              : mode === "register"
              ? (isAr ? "إنشاء وحفظ كلمة المرور" : "Register Owner Password")
              : (isAr ? "إرسال رابط الاستعادة" : "Send Reset Link")}
          </button>
        </form>

        {/* Secondary Links and Modes */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold">
          {mode === "login" ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-stone-600 hover:text-[#172a46] underline underline-offset-4"
              >
                {isAr ? "إنشاء كلمة مرور جديدة للمالك" : "Create owner password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-stone-500 hover:text-[#172a46] underline underline-offset-4"
              >
                {isAr ? "نسيت كلمة المرور؟" : "Forgot password?"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-[#172a46] underline underline-offset-4"
            >
              {isAr ? "العودة لتسجيل الدخول" : "Back to sign in"}
            </button>
          )}
        </div>

    </div>
    </div>
  );
};
