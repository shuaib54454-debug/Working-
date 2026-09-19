import React, { useState, useEffect, useCallback } from "react";
import { Shield, Fingerprint, Lock, Delete, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import {
  getSecuritySettings,
  verifyPinCode,
  promptBiometricAuth,
  checkBiometricSupport,
  setAppLockedState,
} from "../lib/biometricAuth";
import { useLanguage } from "../lib/LanguageContext";

interface SecurityLockScreenProps {
  onUnlocked: () => void;
  onLogout?: () => void;
}

export const SecurityLockScreen: React.FC<SecurityLockScreenProps> = ({
  onUnlocked,
  onLogout,
}) => {
  const { isAr } = useLanguage();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<string>("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const settings = getSecuritySettings();
  const targetPinLength = settings.pinCode ? settings.pinCode.length : 4;

  // Check biometric support on mount
  useEffect(() => {
    let mounted = true;
    checkBiometricSupport().then((info) => {
      if (!mounted) return;
      setBiometricAvailable(info.available && settings.biometricEnabled);
      setBiometryType(info.biometryType);

      // Auto-trigger biometric prompt if enabled
      if (info.available && settings.biometricEnabled) {
        setTimeout(() => {
          handleBiometricUnlock();
        }, 300);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSuccessfulUnlock = useCallback(() => {
    setIsSuccess(true);
    setError(null);
    setAppLockedState(false);
    setTimeout(() => {
      onUnlocked();
    }, 400);
  }, [onUnlocked]);

  const handleBiometricUnlock = async () => {
    setIsAuthenticating(true);
    setError(null);
    try {
      const res = await promptBiometricAuth(
        isAr
          ? "يرجى التحقق من بصمة الإصبع أو الوجه لفتح نظام وكالة شُعيب وحماية بيانات المرشحين"
          : "Please authenticate with fingerprint or Face ID to unlock Shuayb Agency System"
      );
      if (res.success) {
        handleSuccessfulUnlock();
      } else if (res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || (isAr ? "فشل التحقق البيومتري" : "Biometric authentication failed"));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length >= targetPinLength || isSuccess) return;
    const newPin = pin + num;
    setPin(newPin);
    setError(null);

    // If reached length, verify
    if (newPin.length === targetPinLength) {
      if (verifyPinCode(newPin)) {
        handleSuccessfulUnlock();
      } else {
        triggerWrongPin();
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError(null);
    }
  };

  const triggerWrongPin = () => {
    setIsShaking(true);
    setError(isAr ? "رمز PIN غير صحيح. يرجى المحاولة مرة أخرى." : "Incorrect PIN code. Please try again.");
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([80, 50, 80]);
      } catch {}
    }
    setTimeout(() => {
      setIsShaking(false);
      setPin("");
    }, 600);
  };

  // Listen to keyboard digits
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, targetPinLength]);

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="fixed inset-0 z-99999 flex flex-col items-center justify-between bg-gradient-to-b from-[#0b1728] via-[#172a46] to-[#0d1c31] text-white select-none px-4 py-8 overflow-y-auto"
    >
      {/* Top Agency Header */}
      <div className="flex flex-col items-center text-center mt-4 max-w-sm">
        <div className="relative mb-3">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#c9a84c] to-[#e4cc7b] flex items-center justify-center shadow-lg shadow-[#c9a84c]/20 ring-4 ring-white/10">
            {isSuccess ? (
              <CheckCircle2 className="w-8 h-8 text-[#172a46] animate-bounce" />
            ) : (
              <Shield className="w-8 h-8 text-[#172a46]" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-[#172a46]">
            <Lock className="w-3 h-3 text-white" />
          </div>
        </div>

        <h1 className="text-xl font-black text-white tracking-wide">
          {isAr ? "وكالة شُعيب للاستقدام" : "Shuayb Agency"}
        </h1>
        <p className="text-xs text-stone-300 font-bold mt-1">
          {isAr
            ? "نظام الأمان وخصوصية بيانات المرشحين"
            : "Candidate Privacy & Security Lock"}
        </p>
      </div>

      {/* Center PIN Indicators & Error */}
      <div className="flex flex-col items-center w-full max-w-xs my-auto py-4">
        <div className="text-center mb-6">
          <p className="text-xs font-bold text-stone-300">
            {isAr
              ? `أدخل رمز PIN المكوّن من ${targetPinLength} أرقام أو استخدم البصمة`
              : `Enter your ${targetPinLength}-digit PIN or use Biometrics`}
          </p>
        </div>

        {/* PIN Dots */}
        <div
          className={`flex items-center justify-center gap-4 mb-4 transition-transform duration-200 ${
            isShaking ? "animate-shake" : ""
          }`}
        >
          {Array.from({ length: targetPinLength }).map((_, idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isSuccess
                    ? "bg-emerald-400 scale-110 shadow-lg shadow-emerald-400/50"
                    : isFilled
                    ? "bg-[#c9a84c] scale-110 shadow-md shadow-[#c9a84c]/50"
                    : "bg-white/20 border border-white/30"
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {error ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-400/30 text-center animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="h-6" />
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full mt-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-[#c9a84c] active:text-[#172a46] text-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center shadow-xs backdrop-blur-xs border border-white/10"
            >
              {num}
            </button>
          ))}

          {/* Biometric trigger button */}
          <button
            type="button"
            onClick={handleBiometricUnlock}
            disabled={!biometricAvailable || isAuthenticating}
            title={biometryType || (isAr ? "فتح بالبصمة" : "Unlock with Biometrics")}
            className={`h-14 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 border ${
              biometricAvailable
                ? "bg-[#c9a84c]/20 hover:bg-[#c9a84c]/30 text-[#c9a84c] border-[#c9a84c]/30"
                : "bg-white/5 text-stone-500 border-white/5 cursor-not-allowed opacity-40"
            }`}
          >
            <Fingerprint className={`w-6 h-6 ${isAuthenticating ? "animate-pulse" : ""}`} />
            <span className="text-[9px] font-black mt-0.5">
              {isAr ? "البصمة" : "Biometrics"}
            </span>
          </button>

          {/* Zero */}
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="h-14 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-[#c9a84c] active:text-[#172a46] text-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center shadow-xs backdrop-blur-xs border border-white/10"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 sm:h-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-rose-500/30 text-stone-300 hover:text-white transition-all active:scale-95 flex items-center justify-center shadow-xs backdrop-blur-xs border border-white/10"
            title={isAr ? "حذف" : "Delete"}
          >
            <Delete className="w-5 h-5 rtl:rotate-0" />
          </button>
        </div>
      </div>

      {/* Bottom Actions: Biometric Quick Button & Logout */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm mt-4">
        {biometricAvailable && (
          <button
            type="button"
            onClick={handleBiometricUnlock}
            disabled={isAuthenticating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#c9a84c] to-[#dfc476] text-[#172a46] text-xs font-black shadow-md shadow-[#c9a84c]/20 transition-all active:scale-95"
          >
            <Fingerprint className="w-4 h-4" />
            <span>
              {isAr
                ? "استخدام بصمة الإصبع أو الوجه الآن"
                : "Unlock with Fingerprint / Face"}
            </span>
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="text-stone-400 hover:text-white text-xs font-bold transition-colors py-1 flex items-center gap-1.5"
          >
            <span>{isAr ? "تسجيل الخروج أو تبديل الحساب" : "Log out / Switch account"}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
};
