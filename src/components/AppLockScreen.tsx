import React, { useState } from "react";
import { Fingerprint, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { authenticateToUnlock } from "../lib/appLock";

interface AppLockScreenProps {
  isAr?: boolean;
  onUnlocked: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({ isAr = true, onUnlocked }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(false);

  const handleUnlock = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    setError(false);

    const unlocked = await authenticateToUnlock();
    if (unlocked) {
      onUnlocked();
    } else {
      setError(true);
    }

    setIsAuthenticating(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#172a46] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-white/10 border border-white/15 flex items-center justify-center shadow-2xl">
          <ShieldCheck className="w-10 h-10 text-[#c9a84c]" />
        </div>

        <h1 className="text-2xl font-black mb-2">{isAr ? "التطبيق مقفل" : "App Locked"}</h1>
        <p className="text-sm text-white/70 leading-7 mb-8">
          {isAr
            ? "بيانات المرشحين محمية. استخدم البصمة أو رمز PIN/قفل الجهاز لفتح التطبيق."
            : "Candidate data is protected. Use your fingerprint or device PIN to unlock the app."}
        </p>

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-300/30 bg-rose-500/15 px-4 py-3 text-xs font-bold text-rose-100">
            {isAr ? "تعذر التحقق. حاول مرة أخرى." : "Authentication failed. Please try again."}
          </div>
        )}

        <button
          type="button"
          onClick={handleUnlock}
          disabled={isAuthenticating}
          className="w-full py-4 rounded-2xl bg-[#c9a84c] text-[#172a46] font-black flex items-center justify-center gap-3 shadow-xl disabled:opacity-60 active:scale-[0.99] transition-all"
        >
          {isAuthenticating ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Fingerprint className="w-5 h-5" />
          )}
          <span>
            {isAuthenticating
              ? isAr ? "جاري التحقق..." : "Authenticating..."
              : isAr ? "فتح باستخدام البصمة أو PIN" : "Unlock with biometrics or PIN"}
          </span>
        </button>

        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-white/45">
          <LockKeyhole className="w-3.5 h-3.5" />
          <span>{isAr ? "لا يتم تخزين البصمة أو رمز PIN داخل التطبيق" : "Biometrics and PIN are never stored by the app"}</span>
        </div>
      </div>
    </div>
  );
};
