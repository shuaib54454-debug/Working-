import React, { useState } from "react";
import { Lock, Mail, KeyRound, ShieldCheck, ArrowRight, Sparkles, AlertCircle, Eye, EyeOff, CheckCircle2, UserPlus, LogIn } from "lucide-react";
import { loginWithEmail, registerOwnerAccount, resetUserPassword } from "../lib/firebase";
import { useLanguage } from "../lib/LanguageContext";
import { ShuaybLogo } from "./ShuaybLogo";

interface LoginScreenProps {
  onSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const { isAr } = useLanguage();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
        onSuccess();
      } else if (mode === "register") {
        if (password.length < 6) {
          throw new Error(isAr ? "كلمة المرور يجب ألا تقل عن 6 خانات" : "Password must be at least 6 characters");
        }
        if (password !== confirmPassword) {
          throw new Error(isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
        }
        await registerOwnerAccount(email, password);
        onSuccess();
      } else if (mode === "forgot") {
        await resetUserPassword(email);
        setSuccessMessage(
          isAr
            ? "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح"
            : "Password reset link has been sent to your email successfully"
        );
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err?.message || (isAr ? "حدث خطأ أثناء المصادقة" : "Authentication error occurred");
      if (msg.includes("auth/user-not-found") || msg.includes("auth/wrong-password") || msg.includes("auth/invalid-credential")) {
        msg = isAr ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password";
      } else if (msg.includes("auth/email-already-in-use")) {
        msg = isAr ? "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول." : "This email is already registered. Please sign in.";
      } else if (msg.includes("auth/invalid-email")) {
        msg = isAr ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format";
      } else if (msg.includes("auth/weak-password")) {
        msg = isAr ? "كلمة المرور ضعيفة جدًا" : "Password is too weak";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1d31] flex flex-col justify-center items-center p-4 sm:p-6 text-stone-100 relative overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      {/* Ambient background decoration */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#c9a84c]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#172a46]/80 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 text-stone-800 border border-[#c9a84c]/20 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <ShuaybLogo size="lg" variant="icon" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#172a46] tracking-tight">
            Shuayb Trade Bridge
          </h1>
          <p className="text-[11px] font-bold text-[#8B262A] mt-0.5">
            {isAr ? "مكتب تسهيل خدمات وتسويق المنتجات الزراعية وغيرها الإثيوبية" : "Service Facilitation & Ethiopian Products Marketing"}
          </p>
          <p className="text-xs text-stone-500 mt-2 font-medium">
            {mode === "login" && (isAr ? "تسجيل الدخول الآمن لحساب الإدارة" : "Secure Owner Sign In")}
            {mode === "register" && (isAr ? "تهيئة وتسجيل حساب الإدارة الجديد" : "Register Owner Account")}
            {mode === "forgot" && (isAr ? "استعادة وتعيين كلمة المرور" : "Reset Account Password")}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              {isAr ? "البريد الإلكتروني" : "Email Address"}
            </label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@agency.com"
                className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-900 outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white transition-all"
              />
              <Mail className={`w-4 h-4 text-stone-400 absolute top-3.5 ${isAr ? "right-3.5" : "left-3.5"}`} />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-stone-700">
                  {isAr ? "كلمة المرور" : "Password"}
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] font-bold text-[#c9a84c] hover:underline"
                  >
                    {isAr ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-900 outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white transition-all font-mono"
                />
                <Lock className={`w-4 h-4 text-stone-400 absolute top-3.5 ${isAr ? "right-3.5" : "left-3.5"}`} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`text-stone-400 hover:text-stone-600 absolute top-3.5 ${isAr ? "left-3.5" : "right-3.5"}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                {isAr ? "تأكيد كلمة المرور" : "Confirm Password"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-900 outline-none focus:ring-2 focus:ring-[#c9a84c] focus:bg-white transition-all font-mono"
                />
                <KeyRound className={`w-4 h-4 text-stone-400 absolute top-3.5 ${isAr ? "right-3.5" : "left-3.5"}`} />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#172a46] hover:bg-[#203a60] active:scale-[0.99] text-white rounded-2xl font-black text-xs transition-all shadow-md shadow-[#172a46]/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === "login" && (
                  <>
                    <LogIn className="w-4 h-4 text-[#c9a84c]" />
                    <span>{isAr ? "تسجيل الدخول" : "Sign In"}</span>
                  </>
                )}
                {mode === "register" && (
                  <>
                    <UserPlus className="w-4 h-4 text-[#c9a84c]" />
                    <span>{isAr ? "إنشاء حساب المشرف" : "Register Admin"}</span>
                  </>
                )}
                {mode === "forgot" && (
                  <>
                    <KeyRound className="w-4 h-4 text-[#c9a84c]" />
                    <span>{isAr ? "إرسال رابط الاستعادة" : "Send Reset Link"}</span>
                  </>
                )}
              </>
            )}
          </button>
        </form>

        {/* Toggle mode links */}
        <div className="mt-6 pt-5 border-t border-stone-100 flex flex-col items-center gap-2 text-xs">
          {mode === "login" ? (
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-stone-500 hover:text-[#172a46] font-bold"
            >
              {isAr ? "أول مرة؟ تسجيل حساب المالك الجديد" : "First time? Register owner account"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-[#172a46] font-black flex items-center gap-1 hover:underline"
            >
              <ArrowRight className={`w-3.5 h-3.5 ${isAr ? "rotate-0" : "rotate-180"}`} />
              <span>{isAr ? "العودة لتسجيل الدخول" : "Back to Sign In"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Security badge footer */}
      <div className="mt-6 flex items-center gap-2 text-[11px] text-stone-400 font-medium">
        <Lock className="w-3.5 h-3.5 text-[#c9a84c]" />
        <span>{isAr ? "اتصال مشفر وآمن عبر Firebase Authentication" : "Encrypted & Secured by Firebase Authentication"}</span>
      </div>
    </div>
  );
};
