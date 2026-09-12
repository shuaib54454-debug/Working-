/**
 * Google Calendar API Integration for Syncing Candidate Appointments
 * Uses Google Calendar API v3: https://www.googleapis.com/calendar/v3/calendars/primary/events
 */

import { Candidate } from "../types";

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: "popup" | "email";
      minutes: number;
    }>;
  };
  extendedProperties?: {
    private?: Record<string, string>;
  };
  htmlLink?: string;
  status?: string;
}

export interface SyncCandidateAppointmentOptions {
  calendarId?: string; // defaults to "primary"
  remindMinutes?: number[]; // e.g. [1440, 120] (1 day & 2 hours before)
  eventType: "medical" | "flight";
  timeString?: string; // Optional HH:mm if specific time chosen
}

export interface SyncResult {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  summary: string;
  date: string;
  candidateId: string;
  eventType: "medical" | "flight";
  error?: string;
}

/**
 * Calculates the next day string (YYYY-MM-DD) for Google Calendar all-day event ends
 */
export function getNextDayDateString(dateStr: string): string {
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Lists upcoming events from primary calendar to check for existing synced appointments
 */
export async function listCalendarEvents(
  accessToken: string,
  calendarId = "primary",
  timeMin?: string,
  maxResults = 100
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime"
  });

  if (timeMin) {
    params.set("timeMin", timeMin);
  } else {
    // default to 30 days ago to include recent and upcoming events
    const past = new Date();
    past.setDate(past.getDate() - 30);
    params.set("timeMin", past.toISOString());
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل جلب مواعيد التقويم (${response.status})`);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Creates a new event in the user's Google Calendar
 */
export async function createCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEvent,
  calendarId = "primary"
): Promise<GoogleCalendarEvent> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل إنشاء الموعد في تقويم Google (${response.status})`);
  }

  return await response.json();
}

/**
 * Deletes an event from Google Calendar by ID
 */
export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId = "primary"
): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل حذف الموعد من التقويم (${response.status})`);
  }

  return true;
}

/**
 * Synchronizes a candidate's specific appointment (medical or flight) to Google Calendar
 */
export async function syncCandidateAppointment(
  accessToken: string,
  candidate: Candidate,
  options: SyncCandidateAppointmentOptions
): Promise<SyncResult> {
  const { eventType, remindMinutes = [1440, 180] } = options;
  const calendarId = options.calendarId || "primary";

  const dateValue = eventType === "medical" ? candidate.medicalDate : candidate.flightDate;

  if (!dateValue) {
    return {
      success: false,
      summary: "",
      date: "",
      candidateId: candidate.id,
      eventType,
      error: eventType === "medical" ? "تاريخ الفحص الطبي غير محدد" : "تاريخ الرحلة غير محدد"
    };
  }

  const candidateFullName = `${candidate.firstName} ${candidate.lastName}`.trim();

  let summary = "";
  let description = "";
  let location = "";

  if (eventType === "medical") {
    summary = `🩺 فحص طبي: ${candidateFullName} (${candidate.id})`;
    description = [
      `موعد فحص طبي للمرشح لدى وكالة الاستقدام:`,
      `• الاسم: ${candidateFullName}`,
      `• المعرف: ${candidate.id}`,
      `• المهنة: ${candidate.job || "غير محدد"} - الجنسية: ${candidate.country || "غير محدد"}`,
      `• رقم الجواز: ${candidate.passportNumber || "غير متوفر"}`,
      `• رقم الهاتف: ${candidate.phone || "غير متوفر"}`,
      `• حالة الفحص: ${candidate.medicalStatus || "مجدول"}`,
      `• الكفيل/جهة العمل: ${candidate.sponsorName || "غير محدد"}`,
      `• تم المزامنة تلقائياً من نظام إدارة الاستقدام.`
    ].join("\n");
    location = candidate.city || "مركز الفحص الطبي المعتمد";
  } else {
    summary = `✈️ موعد السفر/الرحلة: ${candidateFullName} (${candidate.id})`;
    description = [
      `موعد رحلة طيران وسفر المرشح:`,
      `• الاسم: ${candidateFullName}`,
      `• المعرف: ${candidate.id}`,
      `• المهنة: ${candidate.job || "غير محدد"} - الوجهة: ${candidate.country || "غير محدد"}`,
      `• رقم التذكرة/خط الطيران: ${candidate.flightTicketNumber || "مؤكد"}`,
      `• حالة السفر: ${candidate.flightStatus || "تم الحجز"}`,
      `• رقم الجواز: ${candidate.passportNumber || "غير متوفر"}`,
      `• هاتف المرشح: ${candidate.phone || "غير متوفر"}`,
      `• الكفيل/المستقدم: ${candidate.sponsorName || "غير محدد"}`,
      `• تم المزامنة تلقائياً من نظام إدارة الاستقدام.`
    ].join("\n");
    location = "مطار المغادرة / صالة الرحلات الدولية";
  }

  // Construct start/end dates
  const nextDay = getNextDayDateString(dateValue);

  const eventPayload: GoogleCalendarEvent = {
    summary,
    description,
    location,
    start: {
      date: dateValue
    },
    end: {
      date: nextDay
    },
    reminders: {
      useDefault: false,
      overrides: remindMinutes.map((mins) => ({
        method: "popup",
        minutes: mins
      }))
    },
    extendedProperties: {
      private: {
        appSource: "recruitment_agency_system",
        candidateId: candidate.id,
        appointmentType: eventType,
        targetDate: dateValue
      }
    }
  };

  try {
    const created = await createCalendarEvent(accessToken, eventPayload, calendarId);
    return {
      success: true,
      eventId: created.id,
      eventLink: created.htmlLink,
      summary,
      date: dateValue,
      candidateId: candidate.id,
      eventType
    };
  } catch (err: any) {
    return {
      success: false,
      summary,
      date: dateValue,
      candidateId: candidate.id,
      eventType,
      error: err.message || "تعذر إضافة الموعد إلى تقويم Google"
    };
  }
}

/**
 * Scans all candidates for valid medical and flight appointments and syncs them
 */
export async function batchSyncAppointmentsToCalendar(
  accessToken: string,
  candidates: Candidate[],
  options: {
    includeMedical?: boolean;
    includeFlight?: boolean;
    onProgress?: (current: number, total: number, lastResult: SyncResult) => void;
  }
): Promise<SyncResult[]> {
  const { includeMedical = true, includeFlight = true, onProgress } = options;
  const results: SyncResult[] = [];

  const itemsToSync: Array<{ candidate: Candidate; type: "medical" | "flight" }> = [];

  for (const candidate of candidates) {
    if (candidate.archived) continue;

    if (includeMedical && candidate.medicalDate) {
      itemsToSync.push({ candidate, type: "medical" });
    }
    if (includeFlight && candidate.flightDate) {
      itemsToSync.push({ candidate, type: "flight" });
    }
  }

  let completed = 0;
  for (const item of itemsToSync) {
    const res = await syncCandidateAppointment(accessToken, item.candidate, {
      eventType: item.type
    });
    results.push(res);
    completed++;
    onProgress?.(completed, itemsToSync.length, res);
  }

  return results;
}
