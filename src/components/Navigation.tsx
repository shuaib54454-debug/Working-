import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Archive,
  Settings,
  Plus,
  Building2,
  Bell,
  FileSpreadsheet,
  Scan,
  Languages,
  Menu,
  X,
  Sparkles,
  Download,
  Printer,
  FileCheck,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Smartphone,
  CheckCircle2,
  Cloud,
  Layers
} from "lucide-react";
import { ActiveView, AgencySettings } from "../types";
import { useLanguage } from "../lib/LanguageContext";
import { logoutUser } from "../lib/firebase";
import { ShuaybLogo } from "./ShuaybLogo";

export interface NavigationProps {
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onAddCandidate: () => void;
  onOpenGoogleSheetsModal?: () => void;
  onOpenPassportScanner?: () => void;
  onOpenExportModal?: () => void;
  onOpenInstallModal?: () => void;
  settings: AgencySettings;
  candidateCount: number;
  alertCount: number;
  currentUserEmail?: string | null;
}

export const TopBar: React.FC<
  NavigationProps & {
    onToggleMobileMenu?: () => void;
    isMobileMenuOpen?: boolean;
  }
> = ({
  currentView,
  onNavigate,
  onAddCandidate,
  onOpenGoogleSheetsModal,
  onOpenPassportScanner,
  onOpenExportModal,
  onOpenInstallModal,
  settings,
  candidateCount,
  alertCount,
  onToggleMobileMenu
}) => {
  const { t, language, toggleLanguage, isAr } = useLanguage();
  const isSheetConnected = Boolean(localStorage.getItem("rec_connected_sheet_id"));

  return (
    <header className="bg-[#172a46] text-white sticky top-0 z-30 shadow-md border-b border-white/10 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Agency Brand & Mobile Menu Trigger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile hamburger menu button */}
          <button
            onClick={onToggleMobileMenu}
            aria-label="قائمة الخيارات"
            className="md:hidden p-2 -mr-1 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 border border-white/10"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            className="flex items-center gap-2 cursor-pointer active:opacity-80 transition-opacity"
            onClick={() => onNavigate("dashboard")}
          >
            <ShuaybLogo size="md" variant="horizontal" showSubtitle={false} className="text-white" />
            <span className="hidden xl:inline-block px-2 py-0.5 text-[10px] font-bold bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30 rounded-full shrink-0">
              {t.agencyTag}
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          <button
            onClick={() => onNavigate("dashboard")}
            className={`px-3.5 py-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              currentView === "dashboard"
                ? "bg-[#c9a84c] text-[#172a46] shadow-sm font-black"
                : "text-stone-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            {t.dashboard}
          </button>

          <button
            onClick={() => onNavigate("list")}
            className={`px-3.5 py-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              currentView === "list" || currentView === "profile"
                ? "bg-[#c9a84c] text-[#172a46] shadow-sm font-black"
                : "text-stone-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            {t.candidates}
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 font-bold">
              {candidateCount}
            </span>
          </button>

          <button
            onClick={() => onNavigate("finance")}
            className={`px-3.5 py-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              currentView === "finance"
                ? "bg-[#c9a84c] text-[#172a46] shadow-sm font-black"
                : "text-stone-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Wallet className="w-4 h-4" />
            {t.finance}
          </button>

          <button
            onClick={() => onNavigate("archive")}
            className={`px-3.5 py-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              currentView === "archive"
                ? "bg-[#c9a84c] text-[#172a46] shadow-sm font-black"
                : "text-stone-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Archive className="w-4 h-4" />
            {t.archive}
          </button>

          <button
            onClick={() => onNavigate("settings")}
            className={`px-3.5 py-2 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${
              currentView === "settings"
                ? "bg-[#c9a84c] text-[#172a46] shadow-sm font-black"
                : "text-stone-200 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            {t.settings}
          </button>
        </nav>

        {/* Action Button & Integrations Trigger */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            title={language === "ar" ? "Switch to English" : "التحويل إلى العربية"}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all border border-white/15 active:scale-95"
          >
            <Languages className="w-4 h-4 text-[#c9a84c]" />
            <span className="text-[11px] font-bold">{t.langToggle}</span>
          </button>

          {/* Install App Quick Trigger */}
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              title={isAr ? "تثبيت التطبيق على جهازك" : "Install App"}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all border border-white/10 active:scale-95"
            >
              <Smartphone className="w-4 h-4 text-[#c9a84c]" />
              <span className="hidden sm:inline">{isAr ? "تثبيت" : "Install"}</span>
            </button>
          )}

          {/* Passport Scanner Quick Launch (Desktop) */}
          {onOpenPassportScanner && (
            <button
              onClick={onOpenPassportScanner}
              title="ماسح جوازات السفر والتحقق من كود MRZ"
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-[#c9a84c]/20 hover:bg-[#c9a84c]/30 text-[#c9a84c] border border-[#c9a84c]/40 rounded-2xl text-xs font-black transition-all active:scale-95"
            >
              <Scan className="w-4 h-4" />
              <span>{t.passportScan}</span>
            </button>
          )}

          {/* Google Sheets Trigger (Desktop) */}
          {onOpenGoogleSheetsModal && (
            <button
              onClick={onOpenGoogleSheetsModal}
              title="Google Sheets مزامنة وتكامل"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold transition-all border border-white/10 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#c9a84c]" />
              <span>Sheets</span>
              {isSheetConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="جدول متصل" />
              )}
            </button>
          )}

          {/* Alerts Notification Bell */}
          {alertCount > 0 && (
            <button
              onClick={() => onNavigate("dashboard")}
              title="تنبيهات هامة"
              className="relative p-2 text-[#c9a84c] hover:bg-white/10 rounded-2xl transition-colors active:scale-95"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                {alertCount}
              </span>
            </button>
          )}

          {/* Desktop Primary Add Button */}
          <button
            onClick={onAddCandidate}
            className="hidden sm:flex items-center gap-1.5 sm:gap-2 bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] px-3 sm:px-4 py-2 rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t.addCandidate}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export const BottomBar: React.FC<
  NavigationProps & {
    onOpenQuickHub: () => void;
    onToggleMobileMenu: () => void;
  }
> = ({
  currentView,
  onNavigate,
  onOpenQuickHub,
  onToggleMobileMenu,
  candidateCount,
  alertCount
}) => {
  const { t } = useLanguage();

  return (
    <nav aria-label="شريط التنقل السفلي للهاتف" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#172a46]/98 backdrop-blur-lg border-t border-white/15 px-2 py-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.3)] select-none">
      <div className="flex items-center justify-around relative">
        {/* 1. Dashboard */}
        <button
          onClick={() => onNavigate("dashboard")}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-2xl transition-all relative ${
            currentView === "dashboard"
              ? "text-[#c9a84c] font-black scale-105"
              : "text-stone-300 hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 font-bold tracking-tight">{t.dashboard}</span>
          {alertCount > 0 && (
            <span className="absolute top-1 right-2.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
          )}
        </button>

        {/* 2. Candidates */}
        <button
          onClick={() => onNavigate("list")}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-2xl transition-all relative ${
            currentView === "list" || currentView === "profile"
              ? "text-[#c9a84c] font-black scale-105"
              : "text-stone-300 hover:text-white"
          }`}
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-2 px-1 text-[9px] font-black bg-[#c9a84c] text-[#172a46] rounded-full">
              {candidateCount}
            </span>
          </div>
          <span className="text-[11px] mt-0.5 font-bold tracking-tight">{t.candidates}</span>
        </button>

        {/* 3. Center Elevated Quick Actions Hub FAB */}
        <div className="relative -mt-6">
          <button
            onClick={onOpenQuickHub}
            aria-label="مركز الإجراءات السريعة"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#b89539] via-[#c9a84c] to-[#f4dc96] text-[#172a46] shadow-[0_8px_25px_rgba(201,168,76,0.5)] border-4 border-[#172a46] flex items-center justify-center active:scale-90 transition-all duration-200"
          >
            <Plus className="w-7 h-7 stroke-[3]" />
          </button>
        </div>

        {/* 4. Finance */}
        <button
          onClick={() => onNavigate("finance")}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-2xl transition-all ${
            currentView === "finance"
              ? "text-[#c9a84c] font-black scale-105"
              : "text-stone-300 hover:text-white"
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 font-bold tracking-tight">{t.finance}</span>
        </button>

        {/* 5. More / Mobile Drawer */}
        <button
          onClick={onToggleMobileMenu}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-2xl transition-all ${
            currentView === "settings" || currentView === "archive"
              ? "text-[#c9a84c] font-black scale-105"
              : "text-stone-300 hover:text-white"
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[11px] mt-0.5 font-bold tracking-tight">المزيد</span>
        </button>
      </div>
    </nav>
  );
};

// Mobile Quick Actions Bottom Sheet
export const MobileQuickActionsSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAddCandidate: () => void;
  onOpenPassportScanner?: () => void;
  onOpenGoogleSheetsModal?: () => void;
  onOpenExportModal?: () => void;
  onNavigate: (view: ActiveView) => void;
}> = ({
  isOpen,
  onClose,
  onAddCandidate,
  onOpenPassportScanner,
  onOpenGoogleSheetsModal,
  onOpenExportModal,
  onNavigate
}) => {
  const { t, isAr } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 shadow-2xl border-t border-stone-200 animate-in slide-in-from-bottom-6 duration-200 z-10">
        {/* Drag Handle */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mb-4" />

        {/* Sheet Title */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#c9a84c]/20 text-[#c9a84c] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#172a46]">
                {isAr ? "مركز الإجراءات السريعة" : "Quick Actions Hub"}
              </h3>
              <p className="text-[11px] text-stone-400">
                {isAr ? "اختر عملية سريعة لتنفيذها بلمسة واحدة" : "Choose an action to run in 1-tap"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6 Quick Action Grid Cards */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Action 1: Add Candidate */}
          <button
            onClick={() => {
              onClose();
              onAddCandidate();
            }}
            className="flex flex-col items-start p-3.5 rounded-2xl bg-stone-50 hover:bg-[#c9a84c]/10 border border-stone-200 hover:border-[#c9a84c]/40 text-right transition-all active:scale-95 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#c9a84c] text-[#172a46] flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
            <span className="font-extrabold text-xs text-[#172a46]">
              {isAr ? "إضافة مرشح جديد" : "Add Candidate"}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5">
              {isAr ? "تسجيل بيانات المتقدم" : "Register applicant"}
            </span>
          </button>

          {/* Action 2: Passport Scanner */}
          {onOpenPassportScanner && (
            <button
              onClick={() => {
                onClose();
                onOpenPassportScanner();
              }}
              className="flex flex-col items-start p-3.5 rounded-2xl bg-stone-50 hover:bg-blue-50 border border-stone-200 hover:border-blue-300 text-right transition-all active:scale-95 group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <Scan className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xs text-[#172a46]">
                {isAr ? "ماسح الجوازات (MRZ)" : "Passport Scanner"}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5">
                {isAr ? "بالكاميرا والذكاء الاصطناعي" : "Camera & AI OCR"}
              </span>
            </button>
          )}

          {/* Action 3: Finance & Expenses */}
          <button
            onClick={() => {
              onClose();
              onNavigate("finance");
            }}
            className="flex flex-col items-start p-3.5 rounded-2xl bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 text-right transition-all active:scale-95 group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xs text-[#172a46]">
              {isAr ? "المالية والمصروفات" : "Finance & Expenses"}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5">
              {isAr ? "سندات القبض والمصروفات" : "Receipts & Vouchers"}
            </span>
          </button>

          {/* Action 4: Google Sheets */}
          {onOpenGoogleSheetsModal && (
            <button
              onClick={() => {
                onClose();
                onOpenGoogleSheetsModal();
              }}
              className="flex flex-col items-start p-3.5 rounded-2xl bg-stone-50 hover:bg-amber-50 border border-stone-200 hover:border-amber-300 text-right transition-all active:scale-95 group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xs text-[#172a46]">Google Sheets</span>
              <span className="text-[10px] text-stone-400 mt-0.5">
                {isAr ? "مزامنة الجداول السحابية" : "Cloud Sheets sync"}
              </span>
            </button>
          )}

          {/* Action 5: Export / Reports */}
          {onOpenExportModal && (
            <button
              onClick={() => {
                onClose();
                onOpenExportModal();
              }}
              className="flex flex-col items-start p-3.5 rounded-2xl bg-stone-50 hover:bg-purple-50 border border-stone-200 hover:border-purple-300 text-right transition-all active:scale-95 group"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
                <Download className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xs text-[#172a46]">
                {isAr ? "تصدير وطباعة تقارير" : "Export & Reports"}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5">
                {isAr ? "PDF و Excel و CSV" : "PDF, Excel & CSV"}
              </span>
            </button>
          )}

          {/* Action 6: Archive */}
          <button
            onClick={() => {
              onClose();
              onNavigate("archive");
            }}
            className="flex flex-col items-start p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-stone-300 text-right transition-all active:scale-95 group"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-700 text-white flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
              <Archive className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xs text-[#172a46]">
              {isAr ? "أرشيف وسجلات السفر" : "Travelled Archive"}
            </span>
            <span className="text-[10px] text-stone-400 mt-0.5">
              {isAr ? "المرشحون المكتمل سفرهم" : "Completed candidates"}
            </span>
          </button>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-black transition-colors"
        >
          {isAr ? "إغلاق النافذة" : "Close"}
        </button>
      </div>
    </div>
  );
};

// Full Mobile Drawer Menu
export const MobileDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  settings: AgencySettings;
  candidateCount: number;
  currentUserEmail?: string | null;
  onOpenPassportScanner?: () => void;
  onOpenGoogleSheetsModal?: () => void;
  onOpenExportModal?: () => void;
  onOpenInstallModal?: () => void;
}> = ({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  settings,
  candidateCount,
  currentUserEmail,
  onOpenPassportScanner,
  onOpenGoogleSheetsModal,
  onOpenExportModal,
  onOpenInstallModal
}) => {
  const { t, language, toggleLanguage, isAr } = useLanguage();
  const ArrowIcon = isAr ? ChevronLeft : ChevronRight;
  const isSheetConnected = Boolean(localStorage.getItem("rec_connected_sheet_id"));

  if (!isOpen) return null;

  const handleNav = (view: ActiveView) => {
    onNavigate(view);
    onClose();
  };

  const handleSignOut = async () => {
    if (window.confirm(isAr ? "هل أنت متأكد من تسجيل الخروج؟" : "Are you sure you want to sign out?")) {
      await logoutUser();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-4/5 max-w-xs bg-[#172a46] text-white h-full flex flex-col justify-between shadow-2xl p-5 z-10 border-l border-white/10 animate-in slide-in-from-right duration-200">
        {/* Top Header info */}
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2">
              <ShuaybLogo size="md" variant="horizontal" showSubtitle={false} className="text-white" />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Account / Email Badge */}
          {currentUserEmail && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 mb-4 text-[11px] text-stone-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#c9a84c] shrink-0" />
              <span className="truncate">{currentUserEmail}</span>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1">
            <button
              onClick={() => handleNav("dashboard")}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                currentView === "dashboard"
                  ? "bg-[#c9a84c] text-[#172a46] font-black"
                  : "text-stone-200 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>{t.dashboard}</span>
              </div>
              <ArrowIcon className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => handleNav("list")}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                currentView === "list" || currentView === "profile"
                  ? "bg-[#c9a84c] text-[#172a46] font-black"
                  : "text-stone-200 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>{t.candidates}</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold">
                {candidateCount}
              </span>
            </button>

            <button
              onClick={() => handleNav("finance")}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                currentView === "finance"
                  ? "bg-[#c9a84c] text-[#172a46] font-black"
                  : "text-stone-200 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4" />
                <span>{t.finance}</span>
              </div>
              <ArrowIcon className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => handleNav("archive")}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                currentView === "archive"
                  ? "bg-[#c9a84c] text-[#172a46] font-black"
                  : "text-stone-200 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Archive className="w-4 h-4" />
                <span>{t.archive}</span>
              </div>
              <ArrowIcon className="w-4 h-4 opacity-50" />
            </button>

            <button
              onClick={() => handleNav("settings")}
              className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold transition-all ${
                currentView === "settings"
                  ? "bg-[#c9a84c] text-[#172a46] font-black"
                  : "text-stone-200 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>{t.settings}</span>
              </div>
              <ArrowIcon className="w-4 h-4 opacity-50" />
            </button>
          </div>

          {/* Integrated Tools */}
          <div className="mt-4 pt-3 border-t border-white/10 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-3 block mb-1">
              {isAr ? "الأدوات والمزامنة" : "Tools & Sync"}
            </span>

            {onOpenPassportScanner && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPassportScanner();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-stone-200 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Scan className="w-4 h-4 text-[#c9a84c]" />
                  <span>{t.passportScan}</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 bg-[#c9a84c]/20 text-[#c9a84c] rounded-md font-bold">MRZ</span>
              </button>
            )}

            {onOpenGoogleSheetsModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenGoogleSheetsModal();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-stone-200 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-[#c9a84c]" />
                  <span>Google Sheets</span>
                </div>
                {isSheetConnected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            )}

            {onOpenExportModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenExportModal();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-stone-200 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-[#c9a84c]" />
                  <span>{isAr ? "تصدير وطباعة التقارير" : "Export & Reports"}</span>
                </div>
                <ArrowIcon className="w-4 h-4 opacity-50" />
              </button>
            )}

            {onOpenInstallModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenInstallModal();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-2xl text-xs font-bold text-[#c9a84c] bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-[#c9a84c]" />
                  <span>{isAr ? "تثبيت التطبيق على جهازك" : "Install App on Device"}</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 bg-[#c9a84c] text-[#172a46] rounded-md font-black">PWA</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Drawer Actions */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          {/* Language Switch */}
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between p-2.5 bg-white/10 hover:bg-white/20 rounded-2xl text-xs font-bold text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-[#c9a84c]" />
              <span>{isAr ? "تغيير اللغة" : "Change Language"}</span>
            </div>
            <span className="text-[11px] font-black bg-[#c9a84c] text-[#172a46] px-2 py-0.5 rounded-lg">
              {language === "ar" ? "English" : "العربية"}
            </span>
          </button>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-2xl text-xs font-bold transition-colors"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>{isAr ? "تسجيل الخروج" : "Sign Out"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
