import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plane,
  Stethoscope,
  ExternalLink,
  RefreshCw,
  Search,
  UserCheck,
  ChevronRight,
  Sparkles,
  Info,
  CalendarCheck2,
  CalendarPlus,
  LogIn,
  LogOut,
  X,
  BellRing
} from "lucide-react";
import { Candidate } from "../types";
import {
  googleSignIn,
  getAccessToken,
  logout as googleLogout,
  setCachedAccessToken
} from "../lib/googleAuth";
import {
  syncCandidateAppointment,
  batchSyncAppointmentsToCalendar,
  SyncResult
} from "../lib/googleCalendar";

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onUpdateCandidate: (candidateId: string, updates: Partial<Candidate>) => void;
  isAr?: boolean;
}

export interface AppointmentItem {
  id: string; // unique key
  candidate: Candidate;
  type: "medical" | "flight";
  date: string;
  statusText: string;
  details: string;
  daysDiff: number;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onUpdateCandidate,
  isAr = true
}) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string | null;
    photo: string | null;
  } | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "MEDICAL" | "FLIGHT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [syncedEvents, setSyncedEvents] = useState<Record<string, { eventId: string; eventLink?: string }>>({});

  // Quick schedule form state
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [scheduleType, setScheduleType] = useState<"medical" | "flight">("medical");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [showQuickSchedule, setShowQuickSchedule] = useState(false);

  // Check auth on open
  useEffect(() => {
    if (isOpen) {
      checkExistingAuth();
    }
  }, [isOpen]);

  const checkExistingAuth = async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        setIsSignedIn(true);
      }
    } catch (e) {
      console.error("Auth check error:", e);
    }
  };

  const handleSignIn = async () => {
    try {
      setAuthLoading(true);
      setStatusMsg(null);
      const res = await googleSignIn();
      if (res) {
        setIsSignedIn(true);
        setUserProfile({
          name: res.user.displayName || res.user.email || (isAr ? "مستخدم Google" : "Google User"),
          email: res.user.email,
          photo: res.user.photoURL
        });
        setStatusMsg({
          type: "success",
          text: isAr
            ? "تم تسجيل الدخول بنجاح وتفعيل ربط تقويم Google Calendar!"
            : "Successfully authenticated with Google Calendar!"
        });
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      let msg = err.message || (isAr ? "فشل تسجيل الدخول بحساب Google" : "Google sign-in failed");
      if (err?.code === "auth/popup-blocked") {
        msg = isAr ? "يرجى السماح بالنوافذ المنبثقة (Popups) في المتصفح" : "Please allow popups in your browser";
      }
      setStatusMsg({ type: "error", text: msg });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleLogout();
      setIsSignedIn(false);
      setUserProfile(null);
      setStatusMsg({
        type: "info",
        text: isAr ? "تم تسجيل الخروج من حساب Google" : "Signed out of Google account"
      });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  // Compile all appointments from candidates
  const appointments: AppointmentItem[] = useMemo(() => {
    const list: AppointmentItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    candidates.forEach((cand) => {
      if (cand.archived) return;

      if (cand.medicalDate) {
        const d = new Date(cand.medicalDate);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        list.push({
          id: `${cand.id}-medical`,
          candidate: cand,
          type: "medical",
          date: cand.medicalDate,
          statusText: cand.medicalStatus || (isAr ? "مجدول" : "Scheduled"),
          details: cand.city ? `${isAr ? "المدينة/المركز:" : "Location:"} ${cand.city}` : "",
          daysDiff: diffDays
        });
      }

      if (cand.flightDate) {
        const d = new Date(cand.flightDate);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        list.push({
          id: `${cand.id}-flight`,
          candidate: cand,
          type: "flight",
          date: cand.flightDate,
          statusText: cand.flightStatus || (isAr ? "تم الحجز" : "Booked"),
          details: cand.flightTicketNumber
            ? `${isAr ? "رقم التذكرة:" : "Ticket:"} ${cand.flightTicketNumber}`
            : "",
          daysDiff: diffDays
        });
      }
    });

    // Sort by date ascending (soonest first)
    list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return list;
  }, [candidates, isAr]);

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      if (filterType === "MEDICAL" && item.type !== "medical") return false;
      if (filterType === "FLIGHT" && item.type !== "flight") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const candName = `${item.candidate.firstName} ${item.candidate.lastName}`.toLowerCase();
        const candId = item.candidate.id.toLowerCase();
        const passport = (item.candidate.passportNumber || "").toLowerCase();
        const sponsor = (item.candidate.sponsorName || "").toLowerCase();
        if (!candName.includes(q) && !candId.includes(q) && !passport.includes(q) && !sponsor.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, filterType, searchQuery]);

  // Sync single appointment
  const handleSyncItem = async (item: AppointmentItem) => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setIsSignedIn(true);
        } else {
          return;
        }
      } catch (err: any) {
        setStatusMsg({
          type: "error",
          text: err.message || (isAr ? "يرجى تسجيل الدخول بحساب Google أولاً" : "Please sign in with Google first")
        });
        return;
      }
    }

    if (!token) return;

    try {
      setSyncingItemId(item.id);
      setStatusMsg(null);
      const res: SyncResult = await syncCandidateAppointment(token, item.candidate, {
        eventType: item.type
      });

      if (res.success && res.eventId) {
        setSyncedEvents((prev) => ({
          ...prev,
          [item.id]: {
            eventId: res.eventId!,
            eventLink: res.eventLink
          }
        }));
        setStatusMsg({
          type: "success",
          text: isAr
            ? `تمت مزامنة موعد (${item.type === "medical" ? "الفحص الطبي" : "السفر"}) للمرشح ${item.candidate.firstName} بنجاح إلى تقويم Google!`
            : `Appointment synced to Google Calendar for ${item.candidate.firstName}!`
        });
      } else {
        setStatusMsg({
          type: "error",
          text: res.error || (isAr ? "فشلت المزامنة مع تقويم Google" : "Failed to sync appointment")
        });
      }
    } catch (err: any) {
      console.error("Sync error:", err);
      setStatusMsg({
        type: "error",
        text: err.message || (isAr ? "حدث خطأ أثناء المزامنة" : "Sync error occurred")
      });
    } finally {
      setSyncingItemId(null);
    }
  };

  // Batch sync all filtered appointments
  const handleBatchSync = async () => {
    let token = await getAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        if (res) {
          token = res.accessToken;
          setIsSignedIn(true);
        } else {
          return;
        }
      } catch (err: any) {
        setStatusMsg({
          type: "error",
          text: err.message || (isAr ? "يرجى تسجيل الدخول بحساب Google أولاً" : "Please sign in with Google first")
        });
        return;
      }
    }

    if (!token) return;

    try {
      setBatchSyncing(true);
      setStatusMsg(null);
      setBatchProgress({ current: 0, total: filteredAppointments.length });

      const includeMedical = filterType === "ALL" || filterType === "MEDICAL";
      const includeFlight = filterType === "ALL" || filterType === "FLIGHT";

      // Use candidates that match the current filtered list
      const targetCandidates: Candidate[] = Array.from(new Set(filteredAppointments.map((a) => a.candidate)));

      const results = await batchSyncAppointmentsToCalendar(token, targetCandidates, {
        includeMedical,
        includeFlight,
        onProgress: (curr, tot, lastRes) => {
          setBatchProgress({ current: curr, total: tot });
          if (lastRes.success && lastRes.eventId) {
            const key = `${lastRes.candidateId}-${lastRes.eventType}`;
            setSyncedEvents((prev) => ({
              ...prev,
              [key]: { eventId: lastRes.eventId!, eventLink: lastRes.eventLink }
            }));
          }
        }
      });

      const successCount = results.filter((r) => r.success).length;
      setStatusMsg({
        type: "success",
        text: isAr
          ? `اكتملت المزامنة: تمت إضافة وتأكيد ${successCount} من أصل ${results.length} موعد في تقويمك بنجاح!`
          : `Sync complete: Successfully scheduled ${successCount} of ${results.length} appointments to Google Calendar!`
      });
    } catch (err: any) {
      console.error("Batch sync error:", err);
      setStatusMsg({
        type: "error",
        text: err.message || (isAr ? "حدث خطأ أثناء المزامنة الجماعية" : "Batch sync failed")
      });
    } finally {
      setBatchSyncing(false);
      setBatchProgress(null);
    }
  };

  // Quick Schedule handler
  const handleQuickScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId || !scheduleDate) {
      setStatusMsg({
        type: "error",
        text: isAr ? "يرجى اختيار المرشح وتحديد التاريخ" : "Please select candidate and appointment date"
      });
      return;
    }

    const targetCand = candidates.find((c) => c.id === selectedCandidateId);
    if (!targetCand) return;

    // Update candidate record
    const updates: Partial<Candidate> = {};
    if (scheduleType === "medical") {
      updates.medicalDate = scheduleDate;
      updates.medicalStatus = "بانتظار الفحص";
    } else {
      updates.flightDate = scheduleDate;
      updates.flightStatus = "تم الحجز";
    }

    if (scheduleNotes) {
      const existingNotes = targetCand.notes || "";
      updates.notes = existingNotes ? `${existingNotes}\n${scheduleNotes}` : scheduleNotes;
    }

    onUpdateCandidate(selectedCandidateId, updates);

    // If signed in, sync immediately
    const token = await getAccessToken();
    if (token) {
      const updatedCand: Candidate = { ...targetCand, ...updates };
      const res = await syncCandidateAppointment(token, updatedCand, {
        eventType: scheduleType
      });
      if (res.success && res.eventId) {
        const key = `${selectedCandidateId}-${scheduleType}`;
        setSyncedEvents((prev) => ({
          ...prev,
          [key]: { eventId: res.eventId!, eventLink: res.eventLink }
        }));
        setStatusMsg({
          type: "success",
          text: isAr
            ? `تم حفظ الموعد وإضافته لتقويم Google بنجاح للمرشح ${targetCand.firstName}!`
            : `Appointment saved and added to Google Calendar for ${targetCand.firstName}!`
        });
      }
    } else {
      setStatusMsg({
        type: "success",
        text: isAr
          ? "تم حفظ الموعد في سجل المرشح. قم بربط تقويم Google لمزامنته آلياً!"
          : "Appointment saved locally. Connect Google Calendar to sync automatically!"
      });
    }

    // Reset form
    setSelectedCandidateId("");
    setScheduleDate("");
    setScheduleNotes("");
    setShowQuickSchedule(false);
  };

  if (!isOpen) return null;

  const medicalCount = appointments.filter((a) => a.type === "medical").length;
  const flightCount = appointments.filter((a) => a.type === "flight").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden my-auto">
        
        {/* =========================================================================
            MODAL HEADER
        ========================================================================== */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-[#172a46] via-[#1e3658] to-[#172a46] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#c9a84c] shadow-inner">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {isAr ? "مزامنة المواعيد مع تقويم Google" : "Google Calendar Appointment Sync"}
                </h3>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#c9a84c] text-[#172a46]">
                  {appointments.length} {isAr ? "موعد" : "Events"}
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5">
                {isAr
                  ? "جدولة تواريخ الفحص الطبي وتذاكر الطيران مع التذكيرات الآلية على هاتفك وحاسوبك"
                  : "Sync medical checkups and flight bookings with automatic phone & desktop reminders"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
            title={isAr ? "إغلاق" : "Close"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            ACCOUNT CONNECTION & STATUS BANNER
        ========================================================================== */}
        <div className="bg-stone-50 border-b border-stone-200 px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {isSignedIn ? (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border border-emerald-300 shrink-0">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-2 font-bold text-stone-800">
                  <span>{userProfile?.name || (isAr ? "حساب Google متصل" : "Google Account Connected")}</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-black">
                    <CheckCircle2 className="w-3 h-3" />
                    {isAr ? "نشط وجاهز" : "Active"}
                  </span>
                </div>
                {userProfile?.email && <p className="text-[11px] text-stone-500 font-mono">{userProfile.email}</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Info className="w-4 h-4 text-[#c9a84c] shrink-0" />
              <span>
                {isAr
                  ? "قم بربط حساب Google الخاص بك لتمكين إرسال المواعيد والتذكيرات مباشرة إلى تقويمك."
                  : "Connect your Google account to sync appointments and set reminders on your calendar."}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {isSignedIn ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isAr ? "تسجيل الخروج" : "Sign Out"}</span>
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={authLoading}
                className="px-4 py-2 rounded-2xl bg-[#172a46] hover:bg-[#1e3658] text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#c9a84c]" />
                ) : (
                  <LogIn className="w-4 h-4 text-[#c9a84c]" />
                )}
                <span>{isAr ? "تسجيل الدخول بحساب Google" : "Sign in with Google"}</span>
              </button>
            )}

            <button
              onClick={() => setShowQuickSchedule(!showQuickSchedule)}
              className="px-3.5 py-2 rounded-2xl bg-[#c9a84c]/20 hover:bg-[#c9a84c]/30 text-[#172a46] border border-[#c9a84c]/40 text-xs font-black flex items-center gap-1.5 transition-colors"
            >
              <CalendarPlus className="w-4 h-4 text-[#c9a84c]" />
              <span>{isAr ? "تحديد موعد جديد" : "Schedule New"}</span>
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        {statusMsg && (
          <div
            className={`px-5 py-2.5 text-xs font-bold flex items-center justify-between border-b shrink-0 ${
              statusMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : statusMsg.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : statusMsg.type === "error" ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-stone-400 hover:text-stone-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            QUICK SCHEDULE APPOINTMENT DRAWER
        ========================================================================== */}
        {showQuickSchedule && (
          <div className="bg-stone-50/90 border-b border-stone-200 p-4 sm:p-5 shrink-0 animate-in slide-in-from-top-2">
            <div className="max-w-3xl mx-auto">
              <h4 className="text-xs font-black text-[#172a46] mb-3 flex items-center gap-2">
                <CalendarPlus className="w-4 h-4 text-[#c9a84c]" />
                <span>{isAr ? "تحديد وجدولة موعد لمرشح مباشرة" : "Schedule Candidate Appointment Directly"}</span>
              </h4>

              <form onSubmit={handleQuickScheduleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      {isAr ? "اختر المرشح *" : "Select Candidate *"}
                    </label>
                    <select
                      value={selectedCandidateId}
                      onChange={(e) => setSelectedCandidateId(e.target.value)}
                      required
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                    >
                      <option value="">{isAr ? "-- اختر المرشح --" : "-- Select Candidate --"}</option>
                      {candidates
                        .filter((c) => !c.archived)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.firstName} {c.lastName} ({c.id}) - {c.job}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      {isAr ? "نوع الموعد *" : "Appointment Type *"}
                    </label>
                    <select
                      value={scheduleType}
                      onChange={(e) => setScheduleType(e.target.value as "medical" | "flight")}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                    >
                      <option value="medical">🩺 {isAr ? "فحص طبي" : "Medical Examination"}</option>
                      <option value="flight">✈️ {isAr ? "تذكرة ورحلة سفر" : "Flight Booking / Travel"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-600 mb-1">
                      {isAr ? "تاريخ الموعد *" : "Date *"}
                    </label>
                    <input
                      type="date"
                      required
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQuickSchedule(false)}
                    className="px-3 py-1.5 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-200 text-xs font-bold"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] text-xs font-black shadow-xs transition-transform active:scale-95"
                  >
                    {isAr ? "حفظ وجدولة الموعد" : "Save & Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            METRICS & FILTER CONTROLS
        ========================================================================== */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-white shrink-0 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl w-fit">
              <button
                onClick={() => setFilterType("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  filterType === "ALL"
                    ? "bg-white text-[#172a46] shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {isAr ? "جميع المواعيد" : "All Events"} ({appointments.length})
              </button>

              <button
                onClick={() => setFilterType("MEDICAL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  filterType === "MEDICAL"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>{isAr ? "الفحص الطبي" : "Medical"}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                  {medicalCount}
                </span>
              </button>

              <button
                onClick={() => setFilterType("FLIGHT")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  filterType === "FLIGHT"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                <span>{isAr ? "رحلات السفر" : "Flights"}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10">
                  {flightCount}
                </span>
              </button>
            </div>

            {/* Actions & Search */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder={isAr ? "بحث بالاسم أو الجواز..." : "Search name or passport..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none focus:ring-1 focus:ring-[#c9a84c]"
                />
              </div>

              {filteredAppointments.length > 0 && (
                <button
                  onClick={handleBatchSync}
                  disabled={batchSyncing}
                  title={isAr ? "مزامنة جميع المواعيد المعروضة لتقويم Google" : "Sync all to Google Calendar"}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0"
                >
                  {batchSyncing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>
                    {batchSyncing
                      ? isAr
                        ? `جاري المزامنة (${batchProgress?.current || 0}/${batchProgress?.total || 0})...`
                        : `Syncing (${batchProgress?.current || 0}/${batchProgress?.total || 0})...`
                      : isAr
                      ? "مزامنة الكل لتقويم Google"
                      : "Sync All to Calendar"}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            APPOINTMENTS LIST
        ========================================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 bg-stone-50/50">
          {filteredAppointments.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-stone-100 flex items-center justify-center text-stone-400">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-extrabold text-stone-700 text-sm">
                  {isAr ? "لا توجد مواعيد مجدولة مطابقة" : "No scheduled appointments found"}
                </h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  {isAr
                    ? "يمكنك إدخال تواريخ الفحص الطبي وتذاكر الطيران في ملف أي مرشح أو النقر على 'تحديد موعد جديد' أعلاه."
                    : "Add medical exam or flight dates in candidate profiles or click 'Schedule New' above."}
                </p>
              </div>
            </div>
          ) : (
            filteredAppointments.map((item) => {
              const isMedical = item.type === "medical";
              const isSynced = syncedEvents[item.id] !== undefined;
              const isSyncing = syncingItemId === item.id;
              const cand = item.candidate;

              // Friendly timing label
              let timingBadge = "";
              let timingColor = "";
              if (item.daysDiff < 0) {
                timingBadge = isAr ? `مضى منذ ${Math.abs(item.daysDiff)} يوم` : `${Math.abs(item.daysDiff)}d ago`;
                timingColor = "bg-stone-100 text-stone-600 border-stone-200";
              } else if (item.daysDiff === 0) {
                timingBadge = isAr ? "اليوم!" : "Today!";
                timingColor = "bg-rose-100 text-rose-700 border-rose-300 animate-pulse font-black";
              } else if (item.daysDiff === 1) {
                timingBadge = isAr ? "غداً" : "Tomorrow";
                timingColor = "bg-amber-100 text-amber-800 border-amber-300 font-black";
              } else {
                timingBadge = isAr ? `خلال ${item.daysDiff} أيام` : `In ${item.daysDiff} days`;
                timingColor = "bg-blue-50 text-blue-700 border-blue-200";
              }

              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-2xl border border-stone-200 hover:border-stone-300 shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Type icon avatar */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isMedical
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                          : "bg-sky-50 text-sky-600 border-sky-200"
                      }`}
                    >
                      {isMedical ? <Stethoscope className="w-5 h-5" /> : <Plane className="w-5 h-5" />}
                    </div>

                    {/* Candidate & Event info */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-stone-900 truncate">
                          {cand.firstName} {cand.lastName}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                          {cand.id}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isMedical
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-sky-50 text-sky-700 border-sky-200"
                          }`}
                        >
                          {isMedical ? (isAr ? "فحص طبي" : "Medical") : (isAr ? "رحلة طيران" : "Flight")}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-stone-500 flex-wrap">
                        <span className="font-bold text-stone-700">{cand.job}</span>
                        <span>•</span>
                        <span>{cand.country}</span>
                        {cand.passportNumber && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[11px]">{cand.passportNumber}</span>
                          </>
                        )}
                        {item.details && (
                          <>
                            <span>•</span>
                            <span className="text-stone-600 font-medium">{item.details}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date, Timing Badge & Sync Action */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-stone-100">
                    <div className="text-left rtl:text-right">
                      <div className="font-mono font-black text-xs text-stone-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{item.date}</span>
                      </div>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border mt-0.5 ${timingColor}`}>
                        {timingBadge}
                      </span>
                    </div>

                    {/* Sync Action */}
                    {isSynced ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isAr ? "تمت المزامنة" : "Synced"}</span>
                        </span>
                        {syncedEvents[item.id]?.eventLink && (
                          <a
                            href={syncedEvents[item.id].eventLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
                            title={isAr ? "عرض في Google Calendar" : "View in Google Calendar"}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSyncItem(item)}
                        disabled={isSyncing || batchSyncing}
                        className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-[#c9a84c]/20 hover:text-[#172a46] hover:border-[#c9a84c]/40 text-stone-700 border border-stone-200 text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                        title={isAr ? "إضافة وتأكيد الموعد في تقويم Google" : "Sync to Google Calendar"}
                      >
                        {isSyncing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#c9a84c]" />
                        ) : (
                          <CalendarPlus className="w-3.5 h-3.5 text-[#c9a84c]" />
                        )}
                        <span>{isAr ? "مزامنة للتقويم" : "Add to Calendar"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* =========================================================================
            MODAL FOOTER
        ========================================================================== */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#c9a84c]" />
            <span>
              {isAr
                ? "يتم إرسال تذكيرات آلية إلى تقويمك قبل الموعد بـ 24 ساعة وساعتين."
                : "Automatic reminders are scheduled 24 hours & 2 hours before event."}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isAr ? "فتح Google Calendar" : "Open Calendar"}</span>
            </a>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#172a46] hover:bg-[#1e3658] text-white font-black transition-colors"
            >
              {isAr ? "تم" : "Done"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
