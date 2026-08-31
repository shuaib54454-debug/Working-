import type { Candidate } from "../types";

export type CandidateDuplicateMatch =
  | "passportNumber"
  | "nameAndDateOfBirth";

export interface CandidateDuplicate {
  candidate: Candidate;
  matchedOn: CandidateDuplicateMatch;
}

export interface CandidateDuplicateResult {
  confirmed: CandidateDuplicate[];
  possible: CandidateDuplicate[];
}

const normalizeText = (value?: string): string =>
  (value || "")
    .trim()
    .toLocaleLowerCase("ar")
    .replace(/\s+/g, " ");

const normalizePassport = (value?: string): string =>
  (value || "").trim().toUpperCase().replace(/\s+/g, "");

const normalizeDate = (value?: string): string => (value || "").trim();

export function findCandidateDuplicates(
  candidates: Candidate[],
  input: Pick<Candidate, "firstName" | "lastName" | "dateOfBirth" | "passportNumber">
): CandidateDuplicateResult {
  const passport = normalizePassport(input.passportNumber);
  const firstName = normalizeText(input.firstName);
  const lastName = normalizeText(input.lastName);
  const dateOfBirth = normalizeDate(input.dateOfBirth);

  const confirmed: CandidateDuplicate[] = [];
  const possible: CandidateDuplicate[] = [];

  for (const candidate of candidates) {
    const candidatePassport = normalizePassport(candidate.passportNumber);

    if (passport && candidatePassport && passport === candidatePassport) {
      confirmed.push({ candidate, matchedOn: "passportNumber" });
      continue;
    }

    const sameNameAndDob =
      Boolean(firstName && lastName && dateOfBirth) &&
      normalizeText(candidate.firstName) === firstName &&
      normalizeText(candidate.lastName) === lastName &&
      normalizeDate(candidate.dateOfBirth) === dateOfBirth;

    if (sameNameAndDob) {
      possible.push({ candidate, matchedOn: "nameAndDateOfBirth" });
    }
  }

  return { confirmed, possible };
}
