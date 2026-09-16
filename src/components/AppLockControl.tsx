import React, { useEffect, useState } from "react";
import { Fingerprint, Lock, LockOpen, ShieldCheck, X } from "lucide-react";
import {
  APP_LOCK_CHANGED_EVENT,
  canUseDeviceAuthentication,
  isAppLockEnabled,
  isNativeApp,
  setAppLockEnabled,
  authenticateToUnlock
} from "../lib/appLock";

export const AppLockControl: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(isAppLockEnabled());
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isNativeApp()) return;
    void canUseDeviceAuthentication().then(setAvailable);

    const onChanged = () => setEnabled(isAppLockEnabled());
    window.addEventListener(APP_LOCK_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(APP_LOCK_CHANGED_EVENT, onChanged);
  }, []);

  if (!isNativeApp()) return null;

  const toggleLock = async () => {
    setBusy(true);
    setMessage("");

    if (enabled) {
      setAppLockEnabled(false);
      setEnabled(false);
      setMessage("تم تعطيل قفل التطبيق على هذا الجهاز.");
      setBusy(false);
      return;
    }

    const verified = await authenticateToUnlock();
    if (!verified) {
      setMessage("لم يتم تفعيل القفل لأن التحقق لم ينجح.");
      setBusy(false);
      return;
    }

    setAppLockEnabled(true);
    setEnabled(true);
    setMessage("تم تفعيل القفل. سيطلب التطبيق البصمة أو PIN عند الفتح والعودة من الخلفية.");
    setBusy(false);
  };

  return (
    <div className="fixed bottom-20 right-4 z-[9000]" dir="rtl">
      {open && (
        <div className="mb-2 w-72 rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#c9a84c]" />
              <div>
                <div className="text-xs font-black text-[#172a46]">قفل التطبيق</div>
                <div className="text-[10px] text-stone-500">البصمة أو PIN الخاص بالجهاز</div>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className={`mb-3 rounded-xl px-3 py-2 text-[10px] font-bold ${enabled ? "bg-emerald-50 text-emerald-700" : "bg-stone-50 text-stone-500"}`}>
            {enabled ? "القفل مفعّل" : "القفل غير مفعّل"}
          </div>

          {!available && !enabled && (
            <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[10px] font-bold text-amber-800">
              لا توجد وسيلة مصادقة مدعومة على هذا الجهاز.
            </div>
          )}

          {message && (
            <div className="mb-3 rounded-xl bg-stone-50 border border-stone-200 px-3 py-2 text-[10px] font-bold text-stone-700 leading-5">
              {message}
            </div>
          )}

          <button
            type="button"
            disabled={busy || (!available && !enabled)}
            onClick={() => void toggleLock()}
            className="w-full rounded-xl bg-[#172a46] py-2.5 text-xs font-black text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {enabled ? <LockOpen className="w-4 h-4 text-[#c9a84c]" /> : <Fingerprint className="w-4 h-4 text-[#c9a84c]" />}
            {busy ? "جاري التحقق..." : enabled ? "تعطيل القفل" : "تفعيل القفل"}
          </button>
        </div>
      )}

      <button
        type="button"
        aria-label="إعدادات قفل التطبيق"
        onClick={() => setOpen((value) => !value)}
        className="w-11 h-11 rounded-full bg-[#172a46] border border-[#c9a84c]/50 text-[#c9a84c] shadow-xl flex items-center justify-center"
      >
        {enabled ? <Lock className="w-5 h-5" /> : <Fingerprint className="w-5 h-5" />}
      </button>
    </div>
  );
};
