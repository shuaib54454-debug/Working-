import test from "node:test";
import assert from "node:assert/strict";
import { syncCandidateAppointment } from "./googleCalendar";
import type { Candidate } from "../types";

const candidate: Candidate = {
  id: "CAND-0007",
  ownerUid: "owner-1",
  firstName: "Abebe",
  lastName: "Kebede",
  phone: "+251900000000",
  gender: "male",
  job: "عامل",
  country: "السعودية",
  passportNumber: "ET1234567",
  passportExpiryDate: "2030-04-10",
  stage: "FLIGHT",
  flightDate: "2026-10-15",
  flightStatus: "تم الحجز",
  medicalDate: "2026-10-10",
  medicalStatus: "لائق طبياً",
  totalFees: 0,
  payments: [],
  expenses: [],
  registrationDate: "2026-09-01",
  archived: false,
  sponsorName: "Sensitive Sponsor",
};

test("creates a calendar event without passport, phone, or sponsor data", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    if (url.includes("/events?")) {
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: "event-1", htmlLink: "https://calendar.google.com/event-1" }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await syncCandidateAppointment("token", candidate, {
      eventType: "flight",
      timeString: "14:30",
    });

    assert.equal(result.success, true);
    assert.equal(result.eventId, "event-1");
    assert.equal(requests.length, 2);

    const createBody = JSON.parse(String(requests[1].init?.body));
    const serialized = JSON.stringify(createBody);
    assert.equal(serialized.includes(candidate.passportNumber!), false);
    assert.equal(serialized.includes(candidate.phone), false);
    assert.equal(serialized.includes(candidate.sponsorName!), false);
    assert.equal(createBody.extendedProperties.private.candidateId, candidate.id);
    assert.equal(createBody.extendedProperties.private.appointmentType, "flight");
    assert.equal(createBody.extendedProperties.private.targetDate, candidate.flightDate);
    assert.equal(createBody.start.dateTime, "2026-10-15T11:30:00.000Z");
    assert.equal(createBody.end.dateTime, "2026-10-15T12:30:00.000Z");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns the existing matching event instead of creating a duplicate", async () => {
  const originalFetch = globalThis.fetch;
  let createCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/events?")) {
      return new Response(
        JSON.stringify({
          items: [
            {
              id: "existing-event",
              summary: "✈️ موعد السفر: Abebe Kebede (CAND-0007)",
              htmlLink: "https://calendar.google.com/existing-event",
              extendedProperties: {
                private: {
                  appSource: "recruitment_agency_system",
                  candidateId: "CAND-0007",
                  appointmentType: "flight",
                  targetDate: "2026-10-15",
                },
              },
            },
          ],
        }),
        { status: 200 }
      );
    }
    createCalls++;
    return new Response(JSON.stringify({ id: "unexpected-create" }), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await syncCandidateAppointment("token", candidate, { eventType: "flight" });
    assert.equal(result.success, true);
    assert.equal(result.skippedExisting, true);
    assert.equal(result.eventId, "existing-event");
    assert.equal(createCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
