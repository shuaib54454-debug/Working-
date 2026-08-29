import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canApprovePassportData } from "./passportApprovalGuard";

describe("canApprovePassportData", () => {
  it("rejects approval when there is no verified MRZ", () => {
    assert.equal(canApprovePassportData({
      hasVerifiedMrz: false,
      passportNumber: "P1234567",
      firstName: "John",
      lastName: "Doe",
      birthDate: "1990-01-01",
      expiryDate: "2030-01-01"
    }).allowed, false);
  });

  it("rejects placeholders and incomplete candidate data", () => {
    assert.equal(canApprovePassportData({
      hasVerifiedMrz: true,
      passportNumber: "P0000000",
      firstName: "المرشح",
      lastName: "المرشح",
      birthDate: "1995-01-01",
      expiryDate: "2030-01-01"
    }).allowed, false);
  });

  it("allows complete data backed by verified MRZ", () => {
    assert.equal(canApprovePassportData({
      hasVerifiedMrz: true,
      passportNumber: "A12345678",
      firstName: "JOHN",
      lastName: "DOE",
      birthDate: "1990-01-01",
      expiryDate: "2030-01-01"
    }).allowed, true);
  });

  it("rejects an expired passport", () => {
    assert.equal(canApprovePassportData({
      hasVerifiedMrz: true,
      passportNumber: "A12345678",
      firstName: "JOHN",
      lastName: "DOE",
      birthDate: "1990-01-01",
      expiryDate: "2020-01-01",
      today: "2026-08-29"
    }).allowed, false);
  });
});
