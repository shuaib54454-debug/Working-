/**
 * Google Calendar API Integration for Candidate Appointments
 * Uses Google Calendar API v3.
 */

import { Candidate } from "../types";

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: "popup" | "email"; minutes: number }>;
  };
  extendedProperties?: { private?: Record<string, string> };
  htmlLink?: string;
  status?: string;
}

export interface SyncCandidateAppointmentOptions {
  calendarId?: string;
  remindMinutes?: number[];
  eventType: "medical" | "flight";
  timeString?: string;
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
  skippedExisting?: boolean;
}

export function getNextDayDateString(dateStr: string): string {
  try {
    const parts = dateStr.split("-").map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      d.setDate(d.getDate() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export async function listCalendarEvents(
  accessToken: string,
  calendarId = "primary",
  timeMin?: string,
  maxResults = 100,
  timeMax?: string
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime"
  });

  if (timeMin) params.set("timeMin", timeMin);
  else {
    const past = new Date();
    past.setDate(past.getDate() - 30);
    params.set("timeMin", past.toISOString());
  }
  if (timeMax) params.set("timeMax", timeMax);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل جلب مواعيد التقويم (${response.status})`);
  }

  const data = await response.json();
  return data.items || [];
}

export async function createCalendarEvent(
  accessToken: string,
  event: GoogleCalendarEvent,
  calendarId = "primary"
): Promise<GoogleCalendarEvent> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event)
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل إنشاء الموعد في تقويم Google (${response.status})`);
  }
  return await response.json();
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string,
  calendarId = "primary"
): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل حذف الموعد من التقويم (${response.status})`);
  }
  return true;
}

function buildDateTimeRange(dateValue: string, timeString?: string) {
  if (!timeString || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeString)) return null;
  const start = new Date(`${dateValue}T${timeString}:00`);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

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
  const summary = eventType === "medical"
    ? `🩺 فحص طبي: ${candidateFullName} (${candidate.id})`
    : `✈️ موعد السفر: ${candidateFullName} (${candidate.id})`;

  // Keep personally sensitive candidate data out of the calendar event.
  const description = eventType === "medical"
    ? `موعد فحص طبي للمرشح.\nالمعرف: ${candidate.id}\nالتاريخ: ${dateValue}\nالحالة: ${candidate.medicalStatus || "مجدول"}`
    : `موعد سفر للمرشح.\nالمعرف: ${candidate.id}\nالتاريخ: ${dateValue}\nالحالة: ${candidate.flightStatus || "تم الحجز"}`;
  const location = eventType === "medical"
    ? candidate.city || "مركز الفحص الطبي المعتمد"
    : "مطار المغادرة / صالة الرحلات الدولية";

  const nextDay = getNextDayDateString(dateValue);
  const dateTimeRange = buildDateTimeRange(dateValue, options.timeString);

  // Idempotency key: candidate + appointment type + date. Re-sync returns the existing event.
  const existingEvents = await listCalendarEvents(
    accessToken,
    calendarId,
    `${dateValue}T00:00:00.000Z`,
    100,
    `${nextDay}T00:00:00.000Z`
  );
  const existing = existingEvents.find(
    (event) =>
      event.extendedProperties?.private?.appSource === "recruitment_agency_system" &&
      event.extendedProperties.private.candidateId === candidate.id &&
      event.extendedProperties.private.appointmentType === eventType &&
      event.extendedProperties.private.targetDate === dateValue
  );

  if (existing) {
    return {
      success: true,
      eventId: existing.id,
      eventLink: existing.htmlLink,
      summary: existing.summary || summary,
      date: dateValue,
      candidateId: candidate.id,
      eventType,
      skippedExisting: true
    };
  }

  const eventPayload: GoogleCalendarEvent = {
    summary,
    description,
    location,
    start: dateTimeRange ? { dateTime: dateTimeRange.start } : { date: dateValue },
    end: dateTimeRange ? { dateTime: dateTimeRange.end } : { date: nextDay },
    reminders: {
      useDefault: false,
      overrides: remindMinutes.map((mins) => ({ method: "popup", minutes: mins }))
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
    if (includeMedical && candidate.medicalDate) itemsToSync.push({ candidate, type: "medical" });
    if (includeFlight && candidate.flightDate) itemsToSync.push({ candidate, type: "flight" });
  }

  let completed = 0;
  for (const item of itemsToSync) {
    const res = await syncCandidateAppointment(accessToken, item.candidate, { eventType: item.type });
    results.push(res);
    completed++;
    onProgress?.(completed, itemsToSync.length, res);
  }
  return results;
}
