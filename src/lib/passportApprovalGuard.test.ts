import { describe, expect, it } from "vitest";
import { canApprovePassportData } from "./passportApprovalGuard";

describe("canApprovePassportData", () => {
  it("rejects approval when there is no verified MRZ", () => {
    expect(canApprovePassportData({
      hasVerifiedMrz: false,
      passportNumber: "P1234567",
      firstName: "John",
      lastName: "Doe",
      birthDate: "1990-01-01",
      expiryDate: "2030-01-01"
    }).allowed).toBe(false);
  });

  it("rejects placeholders and incomplete candidate data", () => {
    expect(canApprovePassportData({
      hasVerifiedMrz: true,
      passportNumber: "P0000000",
      firstName: "المرشح",
      lastName: "المرشح",
      birthDate: "1995-01-01",
      expiryDate: "2030-01-01"
    }).allowed).toBe(false);
  });

  it("allows complete data backed by verified MRZ", () => {
    expect(canApprovePassportData({
      hasVerifiedMrz: true,
      passportNumber: "A12345678",
      firstName: "JOHN",
      lastName: "DOE",
      birthDate: "1990-01-01",
      expiryDate: "2030-01-01"
    }).allowed).toBe(true);
  });

  it("rejects an expired passport", () => {
    expect(canApprovePassportData({
      hasVerifiedMrz: true,
      passportNumber: "A12345678",
      firstName: "JOHN",
      lastName: "DOE",
      birthDate: "1990-01-01",
      expiryDate: "2020-01-01",
      today: "2026-08-29"
    }).allowed).toBe(false);
  });
});
