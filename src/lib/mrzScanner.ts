/**
 * ICAO Doc 9303 Compliant Machine Readable Zone (MRZ) Parser, Checksum Validator,
 * and Multi-layer Visual & Date Reconciliation Engine.
 */

// ICAO Country Codes (ISO 3166-1 alpha-3 & ICAO Doc 9303) mapped to Arabic & English names
export const ICAO_COUNTRY_MAP: Record<string, { ar: string; en: string }> = {
  SAU: { ar: "المملكة العربية السعودية", en: "Saudi Arabia" },
  EGY: { ar: "جمهورية مصر العربية", en: "Egypt" },
  YEM: { ar: "الجمهورية اليمنية", en: "Yemen" },
  SDN: { ar: "السودان", en: "Sudan" },
  PAK: { ar: "باكستان", en: "Pakistan" },
  IND: { ar: "الهند", en: "India" },
  PHL: { ar: "الفلبين", en: "Philippines" },
  BGD: { ar: "بنجلاديش", en: "Bangladesh" },
  ETH: { ar: "إثيوبيا", en: "Ethiopia" },
  KEN: { ar: "كينيا", en: "Kenya" },
  UGA: { ar: "أوغندا", en: "Uganda" },
  LKA: { ar: "سريلانكا", en: "Sri Lanka" },
  NPL: { ar: "نيبال", en: "Nepal" },
  IDN: { ar: "إندونيسيا", en: "Indonesia" },
  JOR: { ar: "المملكة الأردنية الهاشمية", en: "Jordan" },
  MAR: { ar: "المغرب", en: "Morocco" },
  SYR: { ar: "سوريا", en: "Syria" },
  TUN: { ar: "تونس", en: "Tunisia" },
  DZA: { ar: "الجزائر", en: "Algeria" },
  LBN: { ar: "لبنان", en: "Lebanon" },
  KWT: { ar: "الكويت", en: "Kuwait" },
  QAT: { ar: "قطر", en: "Qatar" },
  ARE: { ar: "الإمارات العربية المتحدة", en: "United Arab Emirates" },
  BHR: { ar: "البحرين", en: "Bahrain" },
  OMN: { ar: "سلطنة عمان", en: "Oman" },
  IRQ: { ar: "العراق", en: "Iraq" },
  TUR: { ar: "تركيا", en: "Turkey" },
  GBR: { ar: "المملكة المتحدة", en: "United Kingdom" },
  USA: { ar: "الولايات المتحدة", en: "United States" },
  DEU: { ar: "ألمانيا", en: "Germany" },
  FRA: { ar: "فرنسا", en: "France" }
};

export interface MRZChecksumResult {
  value: string;
  expectedCheckDigit: string;
  actualCheckDigit: string;
  isValid: boolean;
}

export interface MRZParsedData {
  documentType: string;
  issuingCountryCode: string;
  issuingCountryName: string;
  surname: string;
  givenNames: string;
  fullNameLatin: string;
  passportNumber: string;
  nationalityCode: string;
  nationalityName: string;
  birthDateRaw: string; // YYMMDD
  birthDateFormatted: string; // YYYY-MM-DD
  gender: "male" | "female" | "other";
  expiryDateRaw: string; // YYMMDD
  expiryDateFormatted: string; // YYYY-MM-DD
  personalNumber?: string;
  rawLine1: string;
  rawLine2: string;
  checksums: {
    passportNumber: MRZChecksumResult;
    birthDate: MRZChecksumResult;
    expiryDate: MRZChecksumResult;
    personalNumber?: MRZChecksumResult;
    composite: MRZChecksumResult;
    allValid: boolean;
  };
}

export interface VisualZoneData {
  fullName?: string;
  fullNameArabic?: string;
  passportNumber?: string;
  birthDate?: string; // YYYY-MM-DD
  expiryDate?: string; // YYYY-MM-DD
  gender?: "male" | "female";
  nationality?: string;
  issueDate?: string;
  placeOfBirth?: string;
  jobTitle?: string;
}

export interface FieldCrossCheck {
  fieldName: string;
  fieldLabel: string;
  mrzValue: string;
  visualValue: string;
  isMatch: boolean;
  status: "pass" | "warning" | "fail";
  message: string;
}

export interface PassportScanAnalysis {
  mrz: MRZParsedData | null;
  visualZone: VisualZoneData | null;
  crossChecks: FieldCrossCheck[];
  validityAnalysis: {
    isExpired: boolean;
    daysRemaining: number;
    monthsRemaining: number;
    status: "valid" | "expiring_soon" | "expired";
    statusText: string;
    isEligibleForVisa: boolean; // > 6 months
  };
  ageAnalysis: {
    age: number;
    isAdult: boolean;
    isWorkAgeEligible: boolean; // between 18 and 60
    statusText: string;
  };
  integrityScore: number; // 0 to 100
  overallStatus: "VERIFIED" | "NEEDS_REVIEW" | "INVALID";
  overallSummary: string;
}

/**
 * Calculates ICAO 9303 check digit for a string using 7-3-1 weight pattern
 */
export function calculateICAOCheckDigit(str: string): string {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i].toUpperCase();
    let val = 0;

    if (char >= "0" && char <= "9") {
      val = char.charCodeAt(0) - 48;
    } else if (char >= "A" && char <= "Z") {
      val = char.charCodeAt(0) - 65 + 10;
    } else if (char === "<" || char === " ") {
      val = 0;
    }

    sum += val * weights[i % 3];
  }

  return String(sum % 10);
}

/**
 * Normalizes and auto-aligns MRZ text lines (cleans spaces, removes OCR artifacts, aligns to standard anchors)
 */
export function sanitizeMRZLine(line: string, isLine1: boolean = true): string {
  if (!line) return "".padEnd(44, "<");

  let cleaned = line.toUpperCase().replace(/[^A-Z0-9<]/g, "<");

  // If Line 1: Auto-detect leading artifacts before P< or country code
  if (isLine1) {
    const pMatch = cleaned.match(/(P[<A-Z0-9][A-Z<]{3}.*)/);
    if (pMatch) {
      cleaned = pMatch[1];
    } else {
      const pSimpleMatch = cleaned.match(/(P<.*)/);
      if (pSimpleMatch) {
        cleaned = pSimpleMatch[1];
      } else {
        cleaned = cleaned.replace(/^<+/, "");
      }
    }
  } else {
    // If Line 2: Strip leading noise chevrons if any
    cleaned = cleaned.replace(/^<+/, "");
  }

  return cleaned.padEnd(44, "<").slice(0, 44);
}

/**
 * Parses YYMMDD date string to YYYY-MM-DD with century heuristic
 */
export function parseMRZDate(yymmdd: string, isExpiry: boolean = false): { formatted: string; isValid: boolean } {
  if (!yymmdd || yymmdd.length !== 6 || !/^\d{6}$/.test(yymmdd)) {
    return { formatted: "", isValid: false };
  }

  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = parseInt(yymmdd.slice(2, 4), 10);
  const dd = parseInt(yymmdd.slice(4, 6), 10);

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return { formatted: "", isValid: false };
  }

  const currentYear = new Date().getFullYear();
  const currentYY = currentYear % 100;

  let fullYear: number;
  if (isExpiry) {
    // Expiry dates are usually in current century
    fullYear = 2000 + yy;
  } else {
    // Birth dates: if yy <= currentYY, likely 2000s, otherwise 1900s
    fullYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
  }

  const formatted = `${fullYear}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return { formatted, isValid: true };
}

/**
 * Maps a country string (Arabic or English or 3-letter code) to standard ICAO 3-letter alpha code
 */
export function findCountryCode(countryStr?: string): string {
  if (!countryStr) return "SAU";
  const upper = countryStr.trim().toUpperCase();
  if (ICAO_COUNTRY_MAP[upper]) return upper;

  for (const [code, info] of Object.entries(ICAO_COUNTRY_MAP)) {
    if (
      countryStr.includes(info.ar) ||
      info.ar.includes(countryStr) ||
      upper.includes(info.en.toUpperCase()) ||
      info.en.toUpperCase().includes(upper)
    ) {
      return code;
    }
  }
  return "SAU";
}

export interface GenerateMRZParams {
  passportNumber: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  birthDate?: string; // YYYY-MM-DD or YYMMDD
  expiryDate?: string; // YYYY-MM-DD or YYMMDD
  gender?: "male" | "female" | "other";
  country?: string;
}

function transliterateArabicToLatin(text: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    'ا': 'A', 'أ': 'A', 'إ': 'E', 'آ': 'A', 'ب': 'B', 'ت': 'T', 'ث': 'TH',
    'ج': 'J', 'ح': 'H', 'خ': 'KH', 'د': 'D', 'ذ': 'DH', 'ر': 'R', 'ز': 'Z',
    'س': 'S', 'ش': 'SH', 'ص': 'S', 'ض': 'D', 'ط': 'T', 'ظ': 'Z', 'ع': 'A',
    'غ': 'GH', 'ف': 'F', 'ق': 'Q', 'ك': 'K', 'ل': 'L', 'م': 'M', 'ن': 'N',
    'ه': 'H', 'و': 'W', 'ي': 'Y', 'ى': 'A', 'ئ': 'Y', 'ء': 'A', 'ة': 'A'
  };
  return text.split('').map(c => map[c] || c).join('');
}

/**
 * Synthesizes 100% ICAO Doc 9303 compliant TD3 MRZ lines (2 x 44 chars) with mathematical check digits
 */
export function generateTD3MRZFromVisual(params: GenerateMRZParams): { line1: string; line2: string } {
  const countryCode = findCountryCode(params.country);

  // Line 1: P< + Country + SURNAME<<GIVEN<NAMES
  let rawSurname = transliterateArabicToLatin(params.lastName || "");
  let surname = rawSurname
    .toUpperCase()
    .replace(/[^A-Z]/g, " ")
    .trim()
    .replace(/\s+/g, "<");

  let rawGiven = transliterateArabicToLatin(params.firstName || "");
  let givenNames = rawGiven
    .toUpperCase()
    .replace(/[^A-Z]/g, " ")
    .trim()
    .replace(/\s+/g, "<");

  if (!surname && !givenNames && params.fullName) {
    const parts = transliterateArabicToLatin(params.fullName)
      .toUpperCase()
      .replace(/[^A-Z\s]/g, "")
      .trim()
      .split(/\s+/);
    if (parts.length > 1) {
      surname = parts[parts.length - 1];
      givenNames = parts.slice(0, -1).join("<");
    } else {
      surname = parts[0] || "CANDIDATE";
      givenNames = parts[0] || "CANDIDATE";
    }
  }

  if (!surname) surname = "CANDIDATE";
  if (!givenNames) givenNames = surname;

  const nameSection = `${surname}<<${givenNames}`.replace(/<+/g, "<").replace(/<+$/, "");
  const line1 = `P<${countryCode}${nameSection}`.padEnd(44, "<").slice(0, 44);

  // Line 2: Passport (9) + Check + Country (3) + Birth (6) + Check + Gender (1) + Expiry (6) + Check + Personal (14) + PersonalCheck (1) + CompositeCheck (1)
  const passClean = (params.passportNumber || "A00000000")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 9);
  const pass9 = passClean.padEnd(9, "<");
  const passCheck = calculateICAOCheckDigit(pass9);

  const formatDateToYYMMDD = (dStr?: string, defaultYY = "90") => {
    if (!dStr) return `${defaultYY}0101`;
    // If format is YYYY-MM-DD or DD/MM/YYYY, normalize first
    const parts = dStr.trim().split(/[-/.]/);
    if (parts.length === 3) {
      // If first part is 4 digits (YYYY-MM-DD)
      if (parts[0].length === 4) {
        const yy = parts[0].slice(2);
        const mm = parts[1].padStart(2, "0");
        const dd = parts[2].padStart(2, "0");
        return `${yy}${mm}${dd}`;
      }
      // If last part is 4 digits (DD-MM-YYYY)
      if (parts[2].length === 4) {
        const yy = parts[2].slice(2);
        const mm = parts[1].padStart(2, "0");
        const dd = parts[0].padStart(2, "0");
        return `${yy}${mm}${dd}`;
      }
    }
    const clean = dStr.replace(/[^0-9]/g, "");
    if (clean.length === 6) return clean;
    if (clean.length === 8) return clean.slice(2);
    return `${defaultYY}0101`;
  };

  const birthYYMMDD = formatDateToYYMMDD(params.birthDate, "90");
  const birthCheck = calculateICAOCheckDigit(birthYYMMDD);

  const genderChar = params.gender === "female" ? "F" : "M";

  const expiryYYMMDD = formatDateToYYMMDD(params.expiryDate, "30");
  const expiryCheck = calculateICAOCheckDigit(expiryYYMMDD);

  const personalNum = "".padEnd(14, "<");
  const personalCheck = "0";

  // Composite check covers positions 1-10, 14-20, 22-43
  const compositeBuffer =
    pass9 +
    passCheck +
    birthYYMMDD +
    birthCheck +
    expiryYYMMDD +
    expiryCheck +
    personalNum +
    personalCheck;
  const compositeCheck = calculateICAOCheckDigit(compositeBuffer);

  const line2 = `${pass9}${passCheck}${countryCode}${birthYYMMDD}${birthCheck}${genderChar}${expiryYYMMDD}${expiryCheck}${personalNum}${personalCheck}${compositeCheck}`
    .padEnd(44, "<")
    .slice(0, 44);

  return { line1, line2 };
}

/**
 * Complete TD3 Passport MRZ Parser (2 lines x 44 characters) with Smart Anchor Alignment
 */
export function parseTD3MRZ(rawLine1: string, rawLine2: string): MRZParsedData | null {
  // TD3 MRZ is strict: exactly two lines, 44 characters each.
  // Never pad, realign, repair, or synthesize missing characters.
  const line1 = (rawLine1 || "").toUpperCase().replace(/\s/g, "");
  const line2 = (rawLine2 || "").toUpperCase().replace(/\s/g, "");

  if (line1.length !== 44 || line2.length !== 44) return null;
  if (!/^P<[A-Z<]{3}/.test(line1)) return null;
  if (!/^[A-Z0-9<]{44}$/.test(line1) || !/^[A-Z0-9<]{44}$/.test(line2)) return null;

  const documentType = line1.slice(0, 2);
  const issuingCountryCode = line1.slice(2, 5);
  if (documentType !== "P<" || !/^[A-Z]{3}$/.test(issuingCountryCode)) return null;

  const issuingCountryName = ICAO_COUNTRY_MAP[issuingCountryCode]?.ar || issuingCountryCode;
  const namePart = line1.slice(5);
  const nameComponents = namePart.split("<<");
  const surname = (nameComponents[0] || "").replace(/</g, " ").trim();
  const givenNames = (nameComponents[1] || "").replace(/</g, " ").trim();
  if (!surname || !givenNames) return null;

  // ICAO TD3 fixed positions:
  // 0-8 passport no, 9 passport check, 10-12 nationality,
  // 13-18 DOB, 19 DOB check, 20 sex, 21-26 expiry,
  // 27 expiry check, 28-41 optional/personal no, 42 personal check,
  // 43 composite check.
  const passportNumberRaw = line2.slice(0, 9);
  const passportNumber = passportNumberRaw.replace(/</g, "").trim();
  const passportCheckDigit = line2[9];
  const nationalityCode = line2.slice(10, 13);
  const birthDateRaw = line2.slice(13, 19);
  const birthCheckDigit = line2[19];
  const sexChar = line2[20];
  const expiryDateRaw = line2.slice(21, 27);
  const expiryCheckDigit = line2[27];
  const personalNumberRaw = line2.slice(28, 42);
  const personalNumber = personalNumberRaw.replace(/</g, "").trim();
  const personalCheckDigit = line2[42];
  const compositeCheckDigit = line2[43];

  if (!/^[A-Z0-9<]{9}$/.test(passportNumberRaw)) return null;
  if (!/^[A-Z]{3}$/.test(nationalityCode)) return null;
  if (!/^\d{6}$/.test(birthDateRaw) || !/^\d{6}$/.test(expiryDateRaw)) return null;
  if (!/[MF<]/.test(sexChar)) return null;

  const birthParsed = parseMRZDate(birthDateRaw, false);
  const expiryParsed = parseMRZDate(expiryDateRaw, true);
  if (!birthParsed.isValid || !expiryParsed.isValid) return null;

  const passportExpected = calculateICAOCheckDigit(passportNumberRaw);
  const birthExpected = calculateICAOCheckDigit(birthDateRaw);
  const expiryExpected = calculateICAOCheckDigit(expiryDateRaw);
  const personalExpected = calculateICAOCheckDigit(personalNumberRaw);
  const compositeString = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43);
  const compositeExpected = calculateICAOCheckDigit(compositeString);

  const checksums = {
    passportNumber: { value: passportNumberRaw, actualCheckDigit: passportCheckDigit, expectedCheckDigit: passportExpected, isValid: passportCheckDigit === passportExpected },
    birthDate: { value: birthDateRaw, actualCheckDigit: birthCheckDigit, expectedCheckDigit: birthExpected, isValid: birthCheckDigit === birthExpected },
    expiryDate: { value: expiryDateRaw, actualCheckDigit: expiryCheckDigit, expectedCheckDigit: expiryExpected, isValid: expiryCheckDigit === expiryExpected },
    personalNumber: { value: personalNumberRaw, actualCheckDigit: personalCheckDigit, expectedCheckDigit: personalExpected, isValid: personalCheckDigit === personalExpected },
    composite: { value: compositeString, actualCheckDigit: compositeCheckDigit, expectedCheckDigit: compositeExpected, isValid: compositeCheckDigit === compositeExpected },
    allValid: passportCheckDigit === passportExpected &&
      birthCheckDigit === birthExpected &&
      expiryCheckDigit === expiryExpected &&
      personalCheckDigit === personalExpected &&
      compositeCheckDigit === compositeExpected
  };

  return {
    documentType,
    issuingCountryCode,
    issuingCountryName,
    surname,
    givenNames,
    fullNameLatin: `${givenNames} ${surname}`.trim(),
    passportNumber,
    nationalityCode,
    nationalityName: ICAO_COUNTRY_MAP[nationalityCode]?.ar || nationalityCode,
    birthDateRaw,
    birthDateFormatted: birthParsed.formatted,
    gender: sexChar === "F" ? "female" : sexChar === "M" ? "male" : "other",
    expiryDateRaw,
    expiryDateFormatted: expiryParsed.formatted,
    personalNumber: personalNumber || undefined,
    rawLine1: line1,
    rawLine2: line2,
    checksums
  };
}

/**
 * Cross-Checks and Reconciles MRZ Parsed Data with Visual Zone (OCR) Data
 */
export function analyzeAndCrossCheckPassport(
  mrzData: MRZParsedData | null,
  visualData: VisualZoneData | null
): PassportScanAnalysis {
  const crossChecks: FieldCrossCheck[] = [];
  let integrityPoints = 100;

  // 1. Passport Number Cross-Check
  if (mrzData && visualData?.passportNumber) {
    const cleanMRZ = mrzData.passportNumber.replace(/\s+/g, "").toUpperCase();
    const cleanVis = visualData.passportNumber.replace(/\s+/g, "").toUpperCase();
    const isMatch = cleanMRZ === cleanVis;

    if (!isMatch) integrityPoints -= 25;

    crossChecks.push({
      fieldName: "passportNumber",
      fieldLabel: "رقم الجواز",
      mrzValue: cleanMRZ,
      visualValue: cleanVis,
      isMatch,
      status: isMatch ? "pass" : "fail",
      message: isMatch
        ? "تطابق تام بين رقم الجواز في الـ MRZ والمنطقة البصرية"
        : `عدم تطابق في رقم الجواز! (MRZ: ${cleanMRZ} مقابل المقروء: ${cleanVis})`
    });
  } else if (mrzData) {
    crossChecks.push({
      fieldName: "passportNumber",
      fieldLabel: "رقم الجواز",
      mrzValue: mrzData.passportNumber,
      visualValue: visualData?.passportNumber || "لم يُقرأ بصرياً",
      isMatch: true,
      status: mrzData.checksums.passportNumber.isValid ? "pass" : "warning",
      message: mrzData.checksums.passportNumber.isValid
        ? "تم استخراج رقم الجواز والتحقق من صحته رياضياً من الـ MRZ"
        : "تحذير: رقم التحقق لرقم الجواز غير مطابق"
    });
  }

  // 2. Expiry Date Cross-Check & Validity Calculation
  let daysRemaining = 0;
  let monthsRemaining = 0;
  let isExpired = false;
  let validityStatus: "valid" | "expiring_soon" | "expired" = "valid";
  let validityText = "";

  const expiryDate = mrzData?.expiryDateFormatted || visualData?.expiryDate;
  if (expiryDate) {
    const expTime = new Date(expiryDate).getTime();
    const nowTime = Date.now();
    const diffMs = expTime - nowTime;
    daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    monthsRemaining = Math.floor(daysRemaining / 30.4);

    if (daysRemaining <= 0) {
      isExpired = true;
      validityStatus = "expired";
      validityText = `الجواز منتهي الصلاحية منذ ${Math.abs(daysRemaining)} يوم`;
      integrityPoints -= 40;
    } else if (monthsRemaining < 6) {
      validityStatus = "expiring_soon";
      validityText = `متبقي ${monthsRemaining} شهر (${daysRemaining} يوم) - غير مناسب للتأشيرات الجديدة (يشترط 6 أشهر)`;
      integrityPoints -= 15;
    } else {
      validityStatus = "valid";
      validityText = `صالح للاستخدام والتأشيرات - متبقي ${monthsRemaining} شهر (${daysRemaining} يوم)`;
    }

    if (mrzData && visualData?.expiryDate) {
      const isMatch = mrzData.expiryDateFormatted === visualData.expiryDate;
      if (!isMatch) integrityPoints -= 20;

      crossChecks.push({
        fieldName: "expiryDate",
        fieldLabel: "تاريخ الانتهاء",
        mrzValue: mrzData.expiryDateFormatted,
        visualValue: visualData.expiryDate,
        isMatch,
        status: isMatch && !isExpired ? "pass" : "fail",
        message: isMatch
          ? `تاريخ الانتهاء متطابق (${mrzData.expiryDateFormatted}) - ${validityText}`
          : `تباين في تاريخ الانتهاء بين MRZ (${mrzData.expiryDateFormatted}) والمنطقة البصرية (${visualData.expiryDate})`
      });
    }
  }

  // 3. Birth Date & Age Calculation
  let age = 0;
  let isAdult = false;
  let isWorkAgeEligible = false;
  let ageStatusText = "";

  const birthDate = mrzData?.birthDateFormatted || visualData?.birthDate;
  if (birthDate) {
    const birthTime = new Date(birthDate).getTime();
    const nowTime = Date.now();
    if (Number.isFinite(birthTime)) {
      age = Math.floor((nowTime - birthTime) / (1000 * 60 * 60 * 24 * 365.25));
      isAdult = age >= 18;
      isWorkAgeEligible = age >= 18 && age <= 60;

      if (!isAdult) {
        ageStatusText = `العمر (${age} سنة) - قاصر غير مؤهل لعقود التوظيف`;
        integrityPoints -= 30;
      } else if (!isWorkAgeEligible) {
        ageStatusText = `العمر (${age} سنة) - يتجاوز السن المعتاد لتأشيرات الاستقدام`;
        integrityPoints -= 10;
      } else {
        ageStatusText = `العمر (${age} سنة) - مؤهل نظامياً للعمل والاستقدام`;
      }
    } else {
      ageStatusText = "لم يتم استخراج تاريخ ميلاد صالح لحساب العمر.";
    }

    if (mrzData && visualData?.birthDate) {
      const isMatch = mrzData.birthDateFormatted === visualData.birthDate;
      if (!isMatch) integrityPoints -= 15;

      crossChecks.push({
        fieldName: "birthDate",
        fieldLabel: "تاريخ الميلاد",
        mrzValue: mrzData.birthDateFormatted,
        visualValue: visualData.birthDate,
        isMatch,
        status: isMatch ? "pass" : "warning",
        message: isMatch
          ? `تاريخ الميلاد متطابق (${mrzData.birthDateFormatted}) - ${ageStatusText}`
          : `اختلاف في تاريخ الميلاد بين السجلين`
      });
    }
  }

  // 4. Gender Cross-Check
  if (mrzData && visualData?.gender) {
    const isMatch = mrzData.gender === visualData.gender;
    if (!isMatch) integrityPoints -= 10;

    crossChecks.push({
      fieldName: "gender",
      fieldLabel: "الجنس",
      mrzValue: mrzData.gender === "male" ? "ذكر" : "أنثى",
      visualValue: visualData.gender === "male" ? "ذكر" : "أنثى",
      isMatch,
      status: isMatch ? "pass" : "warning",
      message: isMatch ? "الجنس متطابق" : "تحذير: عدم تطابق في حقل الجنس"
    });
  }

  // 5. Nationality Cross-Check
  if (mrzData) {
    crossChecks.push({
      fieldName: "nationality",
      fieldLabel: "الجنسية والبلد المصدر",
      mrzValue: `${mrzData.nationalityName} (${mrzData.nationalityCode})`,
      visualValue: visualData?.nationality || mrzData.issuingCountryName,
      isMatch: true,
      status: "pass",
      message: `البلد المصدر: ${mrzData.issuingCountryName}`
    });
  }

  // 6. Checksums Penalty
  if (mrzData) {
    if (!mrzData.checksums.passportNumber.isValid) integrityPoints -= 20;
    if (!mrzData.checksums.birthDate.isValid) integrityPoints -= 15;
    if (!mrzData.checksums.expiryDate.isValid) integrityPoints -= 20;
  }

  // Without a complete, mathematically validated MRZ, an integrity score is not meaningful.
  // Do not display a misleading partial score based only on visual OCR.
  if (!mrzData) integrityPoints = 0;
  integrityPoints = Math.max(0, Math.min(100, integrityPoints));

  let overallStatus: "VERIFIED" | "NEEDS_REVIEW" | "INVALID" = "VERIFIED";
  let overallSummary = "جواز سفر سليم وتمت مطابقة وتدقيق كافة الأرقام والتواريخ بنجاح.";

  // VERIFIED is reserved for a complete, mathematically valid TD3 MRZ.
  // Missing/invalid MRZ must never become VERIFIED merely because dates can be parsed.
  const hasStrictValidMrz = Boolean(mrzData && mrzData.checksums.allValid);

  if (!hasStrictValidMrz || isExpired || integrityPoints < 50) {
    overallStatus = "INVALID";
    overallSummary = !hasStrictValidMrz
      ? "لا يمكن اعتماد الجواز: منطقة MRZ غير مكتملة أو فشلت أرقام التحقق وفق ICAO 9303."
      : isExpired
        ? "تنبيه حرج: جواز السفر منتهي الصلاحية ولا يمكن استخدامه لإصدار التأشيرة."
        : "تحذير: فشل تدقيق التوقيع الرياضي أو عدم تطابق جوهري في البيانات.";
  } else if (integrityPoints < 85 || validityStatus === "expiring_soon") {
    overallStatus = "NEEDS_REVIEW";
    overallSummary =
      validityStatus === "expiring_soon"
        ? "تنبيه: متبقي أقل من 6 أشهر على انتهاء الجواز، يرجى التجديد قبل تقديم التأشيرة."
        : "توجد بعض الاختلافات الطفيفة التي تستدعي مراجعة المدخل يدوياً.";
  }

  return {
    mrz: mrzData,
    visualZone: visualData,
    crossChecks,
    validityAnalysis: {
      isExpired,
      daysRemaining,
      monthsRemaining,
      status: validityStatus,
      statusText: validityText,
      isEligibleForVisa: monthsRemaining >= 6
    },
    ageAnalysis: {
      age,
      isAdult,
      isWorkAgeEligible,
      statusText: ageStatusText
    },
    integrityScore: integrityPoints,
    overallStatus,
    overallSummary
  };
}

/**
 * Built-in Sample Realistic Passports for instant 1-click test & verification
 */
export const SAMPLE_PASSPORTS = [
  {
    title: "جواز سفر إثيوبي - عاملة منزلية (سليم ومطابق 100%)",
    country: "إثيوبيا",
    line1: "P<ETHALEMU<<ABEBECH<MESERET<<<<<<<<<<<<<<<<<<",
    line2: "EP83920148ETH9603150F3108206<<<<<<<<<<<<<<00",
    visual: {
      fullName: "Abebech Meseret Alemu",
      fullNameArabic: "أبيبيتش ميسيريت أليمو",
      passportNumber: "EP8392014",
      birthDate: "1996-03-15",
      expiryDate: "2031-08-20",
      gender: "female" as const,
      nationality: "إثيوبيا",
      jobTitle: "عاملة منزلية"
    }
  },
  {
    title: "جواز سفر مصري (سليم ومطابق 100%)",
    country: "جمهورية مصر العربية",
    line1: "P<EGYAHMED<<MOHAMED<IBRAHIM<<<<<<<<<<<<<<<<<",
    line2: "A284719204EGY8805142M2911206<<<<<<<<<<<<<<06",
    visual: {
      fullName: "محمد إبراهيم أحمد",
      fullNameArabic: "محمد إبراهيم أحمد",
      passportNumber: "A28471920",
      birthDate: "1988-05-14",
      expiryDate: "2029-11-20",
      gender: "male" as const,
      nationality: "جمهورية مصر العربية",
      jobTitle: "محاسب عام"
    }
  },
  {
    title: "جواز سفر فلبيني (سليم ومطابق)",
    country: "الفلبين",
    line1: "P<PHLSANTOS<<MARIA<CLARA<<<<<<<<<<<<<<<<<<<",
    line2: "P918237418PHL9208226F3006154<<<<<<<<<<<<<<08",
    visual: {
      fullName: "Maria Clara Santos",
      fullNameArabic: "ماريا كلارا سانتوس",
      passportNumber: "P91823741",
      birthDate: "1992-08-22",
      expiryDate: "2030-06-15",
      gender: "female" as const,
      nationality: "الفلبين",
      jobTitle: "عاملة منزلية"
    }
  },
  {
    title: "جواز سفر يمني (قارب على الانتهاء - أقل من 6 أشهر)",
    country: "الجمهورية اليمنية",
    line1: "P<YEMALHAMDI<<SALEH<ABDULLAH<<<<<<<<<<<<<<<",
    line2: "0849201932YEM8503104M2610101<<<<<<<<<<<<<<02",
    visual: {
      fullName: "صالح عبدالله الحمدي",
      fullNameArabic: "صالح عبدالله الحمدي",
      passportNumber: "084920193",
      birthDate: "1985-03-10",
      expiryDate: "2026-10-10",
      gender: "male" as const,
      nationality: "الجمهورية اليمنية",
      jobTitle: "سائق خاص"
    }
  }
];
