import React, { useState, useEffect } from "react";
import {
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Share2,
  PlusSquare,
  Monitor,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { ShuaybLogo } from "./ShuaybLogo";
import { useLanguage } from "../lib/LanguageContext";

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { t, isAr } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isRunningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        onClose();
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#172a46] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 shadow-inner">
              <ShuaybLogo size="md" variant="icon" />
            </div>
            <div>
              <h3 className="text-lg font-black">
                {isAr ? "تثبيت تطبيق وكالة شُعيب" : "Install Shuayb App"}
              </h3>
              <p className="text-xs text-[#c9a84c] font-bold">
                Shuayb Trade Bridge • Progressive Web App
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {isStandalone ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-black text-base text-[#172a46]">
                {isAr ? "التطبيق مثبت بالفعل ويعمل كبرنامج مستقل!" : "App is already installed!"}
              </h4>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">
                {isAr
                  ? "أنت تستخدم التطبيق الآن في الوضع المستقل فائق السرعة."
                  : "You are currently running the app in standalone mode."}
              </p>
            </div>
          ) : (
            <>
              {/* Feature Highlights */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <strong className="text-xs text-stone-800 block font-bold">
                      {isAr ? "وصول فوري" : "Instant Access"}
                    </strong>
                    <span className="text-[10px] text-stone-500">
                      {isAr ? "من الشاشة الرئيسية" : "From Home Screen"}
                    </span>
                  </div>
                </div>

                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <strong className="text-xs text-stone-800 block font-bold">
                      {isAr ? "مزامنة سحابية" : "Cloud Sync"}
                    </strong>
                    <span className="text-[10px] text-stone-500">
                      {isAr ? "تخزين آمن ومشفر" : "Encrypted Storage"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct APK Download Button */}
              <a
                href="/api/download-apk"
                download="Shuayb-Agency.apk"
                className="w-full bg-[#172a46] hover:bg-[#1f375b] text-white py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98 border border-[#c9a84c]/30"
              >
                <Smartphone className="w-5 h-5 text-[#c9a84c]" />
                <span>{isAr ? "تحميل ملف التطبيق للهاتف (APK مباشر)" : "Download Android APK Direct"}</span>
              </a>

              {/* Direct Install Button if supported */}
              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-98"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>{isAr ? "تثبيت سريع كـ Web App" : "Install as Web App"}</span>
                </button>
              )}

              {/* Step by Step Guide for iOS / Android / Desktop */}
              <div className="space-y-3 pt-2">
                <h5 className="text-xs font-black text-stone-700">
                  {isAr ? "طريقة التثبيت اليدوي السريع:" : "Quick Manual Installation Steps:"}
                </h5>

                {isIOS ? (
                  <div className="bg-amber-50/70 border border-amber-200/70 p-3.5 rounded-2xl space-y-2 text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-bold">
                      <Share2 className="w-4 h-4 text-amber-700" />
                      <span>{isAr ? "خطوات التثبيت على iPhone و iPad:" : "iPhone & iPad Steps:"}</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-800 pr-1">
                      <li>
                        {isAr
                          ? "اضغط على زر المشاركة (Share ⎋) في أسفل متصفح Safari."
                          : "Tap the Share button (⎋) at the bottom of Safari."}
                      </li>
                      <li>
                        {isAr
                          ? "اختر 'إضافة إلى الشاشة الرئيسية' (Add to Home Screen ⊕)."
                          : "Select 'Add to Home Screen' (⊕)."}
                      </li>
                      <li>
                        {isAr ? "اضغط على 'إضافة' (Add) في أعلى اليمين." : "Tap 'Add' in the top right."}
                      </li>
                    </ol>
                  </div>
                ) : (
                  <div className="bg-blue-50/70 border border-blue-200/70 p-3.5 rounded-2xl space-y-2 text-xs text-blue-950">
                    <div className="flex items-center gap-2 font-bold">
                      <Monitor className="w-4 h-4 text-blue-700" />
                      <span>
                        {isAr ? "على أجهزة أندرويد والكمبيوتر (Chrome / Edge):" : "Android & PC Steps:"}
                      </span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-900 pr-1">
                      <li>
                        {isAr
                          ? "اضغط على خيارات المتصفح (⋮) أو أيقونة التثبيت (⊕) في شريط العنوان."
                          : "Click the browser menu (⋮) or Install icon (⊕) in the address bar."}
                      </li>
                      <li>
                        {isAr
                          ? "اضغط على 'تثبيت التطبيق' (Install app) أو 'إضافة للشاشة الرئيسية'."
                          : "Select 'Install app' or 'Add to Home screen'."}
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer Close */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold transition-colors"
            >
              {isAr ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
