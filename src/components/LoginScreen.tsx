import React, { useState } from "react";
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, LogIn, Mail, ShieldCheck } from "lucide-react";
import { loginWithEmail, resetUserPassword, AppUser } from "../lib/firebase";
import { googleSignIn } from "../lib/googleAuth";
import { useLanguage } from "../lib/LanguageContext";
import { ShuaybLogo } from "./ShuaybLogo";

const OWNER_EMAIL = "shuaib54454@gmail.com";

interface LoginScreenProps {
  onSuccess: () => void;
  // Kept for API compatibility; local sessions are intentionally disabled.
  onContinueLocal?: (user: AppUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { isAr } = useLanguage();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState(OWNER_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const rejectNonOwner = (value: string) => {
    if (value.trim().toLowerCase() !== OWNER_EMAIL) {
      throw new Error(isAr ? "هذا الحساب غير مصرح له. استخدم حساب المالك فقط." : "This account is not authorized. Use the owner account only.");
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result?.user) onSuccess();
    } catch (err: any) {
      setError(err?.message || (isAr ? "فشل تسجيل الدخول بحساب Google" : "Google sign-in failed"));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      rejectNonOwner(email);
      if (mode === "login") {
        await loginWithEmail(email, password);
        onSuccess();
      } else {
        await resetUserPassword(OWNER_EMAIL);
        setSuccessMessage(isAr ? "تم إرسال رابط استعادة كلمة المرور إلى بريد المالك." : "Password reset link sent to the owner email.");
      }
    } catch (err: any) {
      let msg = err?.message || (isAr ? "حدث خطأ أثناء المصادقة" : "Authentication error occurred");
      if (msg.includes("auth/user-not-found") || msg.includes("auth/wrong-password") || msg.includes("auth/invalid-credential")) {
        msg = isAr ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password";
      } else if (msg.includes("auth/invalid-email")) {
        msg = isAr ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1d31] flex items-center justify-center p-4 text-stone-100" dir={isAr ? "rtl" : "ltr"}>
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-stone-800 border border-[#c9a84c]/20">
        <div className="text-center mb-7">
          <div className="flex justify-center mb-3"><ShuaybLogo size="lg" variant="icon" /></div>
          <h1 className="text-xl sm:text-2xl font-black text-[#172a46]">Shuayb Trade Bridge</h1>
          <p className="text-[11px] font-bold text-[#8B262A] mt-1">{isAr ? "تطبيق خاص بحساب المالك" : "Private Owner Account"}</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-stone-50 border border-stone-200 px-3 py-1.5 text-[10px] font-bold text-stone-600">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c9a84c]" />
            {isAr ? "مستخدم واحد فقط — المالك" : "Single user — Owner only"}
          </div>
        </div>

        {error && <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
        {successMessage && <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 font-bold">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">{isAr ? "حساب المالك" : "Owner account"}</label>
            <div className="relative">
              <Mail className="absolute top-3.5 start-3.5 w-4 h-4 text-stone-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" className="w-full ps-10 pe-3 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#c9a84c]" placeholder={OWNER_EMAIL} required />
            </div>
          </div>

          {mode === "login" && <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">{isAr ? "كلمة المرور" : "Password"}</label>
            <div className="relative">
              <KeyRound className="absolute top-3.5 start-3.5 w-4 h-4 text-stone-400" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="w-full ps-10 pe-11 py-3 rounded-2xl border border-stone-200 bg-stone-50 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#c9a84c]" required />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute top-2.5 end-2.5 p-1.5 text-stone-400" aria-label={isAr ? "إظهار كلمة المرور" : "Show password"}>{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>}

          <button type="submit" disabled={loading || googleLoading} className="w-full py-3.5 rounded-2xl bg-[#172a46] hover:bg-[#203a60] text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {mode === "login" ? <LogIn className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {loading ? (isAr ? "جاري التحقق..." : "Verifying...") : mode === "login" ? (isAr ? "دخول المالك" : "Owner Sign In") : (isAr ? "إرسال رابط الاستعادة" : "Send Reset Link")}
          </button>
        </form>

        {mode === "login" && <button type="button" onClick={handleGoogleSignIn} disabled={loading || googleLoading} className="w-full mt-3 py-3 rounded-2xl bg-stone-50 border border-stone-200 text-stone-700 font-bold text-xs disabled:opacity-50">{googleLoading ? (isAr ? "جاري التحقق..." : "Verifying...") : (isAr ? "تسجيل الدخول بحساب المالك Google" : "Sign in with owner Google account")}</button>}

        <button type="button" onClick={() => { setMode(mode === "login" ? "forgot" : "login"); setError(null); setSuccessMessage(null); }} className="w-full mt-4 text-[11px] font-bold text-[#172a46] underline underline-offset-4">
          {mode === "login" ? (isAr ? "نسيت كلمة المرور؟" : "Forgot password?") : (isAr ? "العودة لتسجيل الدخول" : "Back to sign in")}
        </button>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-stone-400">
          {isAr ? "لا يوجد تسجيل حساب جديد أو دخول محلي أو حسابات موظفين في هذه المرحلة." : "New registration, local bypass, and employee accounts are disabled in this phase."}
        </p>
      </div>
    </div>
  );
};
