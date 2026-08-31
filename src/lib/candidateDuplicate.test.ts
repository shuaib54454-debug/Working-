import test from "node:test";
import assert from "node:assert/strict";
import { findCandidateDuplicates } from "./candidateDuplicate";
import type { Candidate } from "../types";

const baseCandidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  id: "CAND-0001",
  ownerUid: "owner-1",
  firstName: "Abebe",
  lastName: "Kebede",
  phone: "0900000000",
  gender: "male",
  dateOfBirth: "1995-04-10",
  job: "عامل",
  country: "إثيوبيا",
  passportNumber: "ET1234567",
  passportExpiryDate: "2030-04-10",
  stage: "NEW",
  totalFees: 0,
  payments: [],
  expenses: [],
  registrationDate: "2026-08-31",
  archived: false,
  ...overrides,
});

test("detects an exact passport duplicate", () => {
  const result = findCandidateDuplicates(
    [baseCandidate()],
    {
      firstName: "Different",
      lastName: "Person",
      dateOfBirth: "2000-01-01",
      passportNumber: "et1234567",
    }
  );

  assert.equal(result.confirmed.length, 1);
  assert.equal(result.possible.length, 0);
  assert.equal(result.confirmed[0].candidate.id, "CAND-0001");
  assert.equal(result.confirmed[0].matchedOn, "passportNumber");
});

test("detects a possible duplicate by normalized name and date of birth", () => {
  const result = findCandidateDuplicates(
    [baseCandidate({ passportNumber: "ET7654321" })],
    {
      firstName: " abebe ",
      lastName: "KEBEDE",
      dateOfBirth: "1995-04-10",
      passportNumber: "",
    }
  );

  assert.equal(result.confirmed.length, 0);
  assert.equal(result.possible.length, 1);
  assert.equal(result.possible[0].matchedOn, "nameAndDateOfBirth");
});

test("does not flag a same-name candidate with a different birth date", () => {
  const result = findCandidateDuplicates(
    [baseCandidate()],
    {
      firstName: "Abebe",
      lastName: "Kebede",
      dateOfBirth: "1996-04-10",
      passportNumber: "",
    }
  );

  assert.equal(result.confirmed.length, 0);
  assert.equal(result.possible.length, 0);
});
