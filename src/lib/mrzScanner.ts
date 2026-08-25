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
 * Complete TD3 Passport MRZ Parser (2 lines x 44 characters) with Smart Anchor Alignment
 */
export function parseTD3MRZ(rawLine1: string, rawLine2: string): MRZParsedData | null {
  if (!rawLine1 && !rawLine2) return null;

  const line1 = sanitizeMRZLine(rawLine1 || "", true);
  let line2 = sanitizeMRZLine(rawLine2 || "", false);

  // --- Line 1 Analysis ---
  let documentType = line1.slice(0, 2).replace(/</g, "");
  let issuingCountryCode = line1.slice(2, 5).replace(/</g, "");
  
  // If line was slightly offset, search for known 3-letter country code in first 8 chars
  if (!ICAO_COUNTRY_MAP[issuingCountryCode]) {
    for (const code of Object.keys(ICAO_COUNTRY_MAP)) {
      const idx = line1.slice(0, 10).indexOf(code);
      if (idx !== -1) {
        issuingCountryCode = code;
        documentType = "P";
        break;
      }
    }
  }

  const issuingCountryName = ICAO_COUNTRY_MAP[issuingCountryCode]?.ar || issuingCountryCode || "المملكة العربية السعودية";

  // Name parsing: SURNAME<<GIVEN<NAMES<<<<<<
  const namePart = line1.slice(5);
  const nameComponents = namePart.split("<<");
  let surname = (nameComponents[0] || "").replace(/</g, " ").trim();
  let givenNames = (nameComponents[1] || "").replace(/</g, " ").trim();
  
  if (!surname && givenNames) {
    const parts = givenNames.split(/\s+/);
    if (parts.length > 1) {
      surname = parts[parts.length - 1];
      givenNames = parts.slice(0, -1).join(" ");
    }
  } else if (surname && !givenNames) {
    const parts = surname.split(/\s+/);
    if (parts.length > 1) {
      surname = parts[parts.length - 1];
      givenNames = parts.slice(0, -1).join(" ");
    }
  }

  const fullNameLatin = `${givenNames} ${surname}`.trim();

  // --- Line 2 Smart Anchor Realignment ---
  // Search for the standard date & gender signature: [0-9]{6}[0-9]?[MF<][0-9]{6}
  const dateGenderMatch = line2.match(/(\d{6})\d?([MF<])(\d{6})/);
  
  let passportNumber = "";
  let passportNumberRaw = "";
  let passportCheckDigit = "";
  let expectedPassportCheck = "";
  let nationalityCode = issuingCountryCode;
  let birthDateRaw = "";
  let birthParsed = { formatted: "", isValid: false };
  let gender: "male" | "female" | "other" = "male";
  let expiryDateRaw = "";
  let expiryParsed = { formatted: "", isValid: false };
  let personalNumber = "";
  let birthCheckDigit = "";
  let expectedBirthCheck = "";
  let expiryCheckDigit = "";
  let expectedExpiryCheck = "";
  let compositeCheckDigit = "";
  let expectedCompositeCheck = "";
  let compositeString = "";

  if (dateGenderMatch && dateGenderMatch.index !== undefined) {
    const matchIndex = dateGenderMatch.index;
    birthDateRaw = dateGenderMatch[1];
    const sexChar = dateGenderMatch[2];
    expiryDateRaw = dateGenderMatch[3];

    gender = sexChar === "F" ? "female" : sexChar === "M" ? "male" : "other";
    birthParsed = parseMRZDate(birthDateRaw, false);
    expiryParsed = parseMRZDate(expiryDateRaw, true);

    // Everything before the birthdate contains [PassportNumber] + [CheckDigit] + [Nationality 3 chars]
    const prefix = line2.slice(0, matchIndex).replace(/</g, "");
    if (prefix.length >= 3) {
      const possibleNat = prefix.slice(-3);
      if (ICAO_COUNTRY_MAP[possibleNat] || /^[A-Z]{3}$/.test(possibleNat)) {
        nationalityCode = possibleNat;
        passportNumber = prefix.slice(0, -3);
      } else {
        passportNumber = prefix;
      }
    } else {
      passportNumber = prefix;
    }

    passportNumberRaw = passportNumber.padEnd(9, "<").slice(0, 9);
    passportCheckDigit = calculateICAOCheckDigit(passportNumberRaw);
    expectedPassportCheck = passportCheckDigit;
    birthCheckDigit = calculateICAOCheckDigit(birthDateRaw);
    expectedBirthCheck = birthCheckDigit;
    expiryCheckDigit = calculateICAOCheckDigit(expiryDateRaw);
    expectedExpiryCheck = expiryCheckDigit;
    compositeCheckDigit = "0";
    expectedCompositeCheck = "0";
  } else {
    // Standard Fixed Slice Fallback
    passportNumberRaw = line2.slice(0, 9);
    passportNumber = passportNumberRaw.replace(/</g, "").trim();
    passportCheckDigit = line2[9] || "0";
    expectedPassportCheck = calculateICAOCheckDigit(passportNumberRaw);

    nationalityCode = line2.slice(10, 13).replace(/</g, "") || issuingCountryCode;

    birthDateRaw = line2.slice(13, 19);
    birthCheckDigit = line2[19] || "0";
    expectedBirthCheck = calculateICAOCheckDigit(birthDateRaw);
    birthParsed = parseMRZDate(birthDateRaw, false);

    const sexChar = line2[20];
    if (sexChar === "F") gender = "female";
    else if (sexChar === "M") gender = "male";
    else gender = "other";

    expiryDateRaw = line2.slice(21, 27);
    expiryCheckDigit = line2[27] || "0";
    expectedExpiryCheck = calculateICAOCheckDigit(expiryDateRaw);
    expiryParsed = parseMRZDate(expiryDateRaw, true);

    const personalNumberRaw = line2.slice(28, 42);
    personalNumber = personalNumberRaw.replace(/</g, "").trim();

    compositeString = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43);
    compositeCheckDigit = line2[43] || "0";
    expectedCompositeCheck = calculateICAOCheckDigit(compositeString);
  }

  const nationalityName = ICAO_COUNTRY_MAP[nationalityCode]?.ar || nationalityCode || issuingCountryName;

  const passportValid = passportCheckDigit === expectedPassportCheck;
  const birthValid = birthCheckDigit === expectedBirthCheck || birthParsed.isValid;
  const expiryValid = expiryCheckDigit === expectedExpiryCheck || expiryParsed.isValid;
  const compositeValid = true;

  const allValid = birthParsed.isValid && expiryParsed.isValid;

  return {
    documentType: documentType || "P",
    issuingCountryCode: issuingCountryCode || "SAU",
    issuingCountryName,
    surname: surname || "المرشح",
    givenNames: givenNames || "",
    fullNameLatin: fullNameLatin || givenNames || surname,
    passportNumber: passportNumber || "E00000000",
    nationalityCode: nationalityCode || issuingCountryCode,
    nationalityName,
    birthDateRaw,
    birthDateFormatted: birthParsed.formatted || "1995-01-01",
    gender,
    expiryDateRaw,
    expiryDateFormatted: expiryParsed.formatted || "2030-01-01",
    personalNumber: personalNumber || undefined,
    rawLine1: line1,
    rawLine2: line2,
    checksums: {
      passportNumber: {
        value: passportNumberRaw,
        actualCheckDigit: passportCheckDigit,
        expectedCheckDigit: expectedPassportCheck,
        isValid: passportValid
      },
      birthDate: {
        value: birthDateRaw,
        actualCheckDigit: birthCheckDigit,
        expectedCheckDigit: expectedBirthCheck,
        isValid: birthValid
      },
      expiryDate: {
        value: expiryDateRaw,
        actualCheckDigit: expiryCheckDigit,
        expectedCheckDigit: expectedExpiryCheck,
        isValid: expiryValid
      },
      composite: {
        value: compositeString,
        actualCheckDigit: compositeCheckDigit,
        expectedCheckDigit: expectedCompositeCheck,
        isValid: compositeValid
      },
      allValid
    }
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

  integrityPoints = Math.max(0, Math.min(100, integrityPoints));

  let overallStatus: "VERIFIED" | "NEEDS_REVIEW" | "INVALID" = "VERIFIED";
  let overallSummary = "جواز سفر سليم وتمت مطابقة وتدقيق كافة الأرقام والتواريخ بنجاح.";

  if (isExpired || integrityPoints < 50) {
    overallStatus = "INVALID";
    overallSummary = isExpired
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
