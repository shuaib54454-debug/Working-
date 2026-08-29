/** Strict ICAO TD3 MRZ validation used as a trust boundary before passport data is applied. */

export type ValidatedGender = "male" | "female" | "other";

export interface TD3ValidationResult {
  isValid: boolean;
  passportNumber: string;
  nationalityCode: string;
  birthDateRaw: string;
  expiryDateRaw: string;
  gender: ValidatedGender;
  errors: string[];
}

function checkDigit(value: string): string {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    let numeric = 0;
    if (char >= "0" && char <= "9") numeric = char.charCodeAt(0) - 48;
    else if (char >= "A" && char <= "Z") numeric = char.charCodeAt(0) - 55;
    else if (char !== "<") return "";
    sum += numeric * weights[i % 3];
  }

  return String(sum % 10);
}

function normalizeLine(line: string): string {
  return line.toUpperCase().replace(/\s+/g, "");
}

function isValidDate(value: string): boolean {
  if (!/^\d{6}$/.test(value)) return false;
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const year = Number(value.slice(0, 2));
  const date = new Date(Date.UTC(2000 + year, month - 1, day));
  return date.getUTCFullYear() === 2000 + year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateTD3MRZ(rawLine1: string, rawLine2: string): TD3ValidationResult {
  const line1 = normalizeLine(rawLine1);
  const line2 = normalizeLine(rawLine2);
  const errors: string[] = [];

  if (line1.length !== 44 || line2.length !== 44) {
    return {
      isValid: false,
      passportNumber: "",
      nationalityCode: "",
      birthDateRaw: "",
      expiryDateRaw: "",
      gender: "other",
      errors: ["length"]
    };
  }

  if (!/^P[A-Z<][A-Z]{3}/.test(line1)) errors.push("documentType");
  if (!/^[A-Z]{3}$/.test(line1.slice(2, 5))) errors.push("issuingCountry");

  const passportNumber = line2.slice(0, 9).replace(/</g, "");
  const nationalityCode = line2.slice(10, 13);
  const birthDateRaw = line2.slice(13, 19);
  const expiryDateRaw = line2.slice(21, 27);
  const genderChar = line2[20];

  if (!passportNumber) errors.push("passportNumber");
  if (!/^[A-Z0-9<]{9}$/.test(line2.slice(0, 9))) errors.push("passportNumber");
  if (line2[9] !== checkDigit(line2.slice(0, 9))) errors.push("passportNumber");
  if (!/^[A-Z]{3}$/.test(nationalityCode)) errors.push("nationality");

  if (!isValidDate(birthDateRaw)) errors.push("birthDate");
  if (line2[19] !== checkDigit(birthDateRaw)) errors.push("birthDate");

  if (genderChar !== "M" && genderChar !== "F" && genderChar !== "<") errors.push("gender");

  if (!isValidDate(expiryDateRaw)) errors.push("expiryDate");
  if (line2[27] !== checkDigit(expiryDateRaw)) errors.push("expiryDate");

  const composite = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 28) + line2.slice(28, 43);
  if (line2[43] !== checkDigit(composite)) errors.push("composite");

  return {
    isValid: errors.length === 0,
    passportNumber,
    nationalityCode,
    birthDateRaw,
    expiryDateRaw,
    gender: genderChar === "F" ? "female" : genderChar === "M" ? "male" : "other",
    errors: [...new Set(errors)]
  };
}
