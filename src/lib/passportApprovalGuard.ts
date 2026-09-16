export interface PassportApprovalInput {
  hasVerifiedMrz: boolean;
  passportNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  expiryDate: string;
  today?: string;
  allowExpired?: boolean;
}

export interface PassportApprovalResult {
  allowed: boolean;
  reason?: string;
  isExpiringSoon?: boolean;
  isExpired?: boolean;
  normalizedData?: {
    passportNumber: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    expiryDate: string;
  };
}

const PLACEHOLDERS = new Set([
  "unknown",
  "undefined",
  "null",
  "none",
  "worker"
]);

/**
 * Normalizes Eastern Arabic numerals (٠-٩) to Latin (0-9)
 */
export function normalizeDigits(str: string): string {
  if (!str) return "";
  return str.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

/**
 * Normalizes any common date format (DD/MM/YYYY, YYYY/MM/DD, DD-MM-YYYY, YYYY-M-D) to strict ISO YYYY-MM-DD
 */
export function normalizeDateToISO(value?: string): string {
  if (!value) return "";
  let clean = normalizeDigits(value).trim();
  if (!clean) return "";

  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const ddmmyyyyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyyMatch) {
    const d = ddmmyyyyMatch[1].padStart(2, "0");
    const m = ddmmyyyyMatch[2].padStart(2, "0");
    const y = ddmmyyyyMatch[3];
    return `${y}-${m}-${d}`;
  }

  return clean;
}

/**
 * Cleans and formats passport number: uppercase, strip spaces and symbols
 */
export function cleanPassportNumber(pass?: string): string {
  if (!pass) return "";
  return normalizeDigits(pass)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const isPlaceholder = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (/^p0{7}$/i.test(normalized)) return true;
  return !normalized || PLACEHOLDERS.has(normalized);
};

export const parseStrictDate = (value: string): Date | null => {
  const iso = normalizeDateToISO(value);
  if (!ISO_DATE.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== iso) return null;
  return date;
};

export function canApprovePassportData(input: PassportApprovalInput): PassportApprovalResult {
  if (!input.hasVerifiedMrz) {
    return { allowed: false, reason: "لا يمكن اعتماد بيانات الجواز بدون MRZ موثّق." };
  }

  const fName = (input.firstName || "").trim();
  let lName = (input.lastName || "").trim();
  if (!lName) lName = fName;

  if (!fName || isPlaceholder(fName)) {
    return { allowed: false, reason: "يرجى كتابة الاسم الأول للمرشح للاعتماد." };
  }

  const passNo = cleanPassportNumber(input.passportNumber);
  if (!passNo || passNo.length < 5 || isPlaceholder(passNo)) {
    return { allowed: false, reason: "يرجى إدخال رقم جواز سفر صحيح (5-12 حرف ورقم)." };
  }

  const birthIso = normalizeDateToISO(input.birthDate);
  const expiryIso = normalizeDateToISO(input.expiryDate);
  const birth = parseStrictDate(birthIso);
  const expiry = parseStrictDate(expiryIso);

  const todayIso = normalizeDateToISO(input.today) || new Date().toISOString().slice(0, 10);
  const today = parseStrictDate(todayIso) || new Date();

  if (!birth) {
    return { allowed: false, reason: "تاريخ الميلاد غير صالح. الصيغة المطلوبة: YYYY-MM-DD." };
  }

  if (!expiry) {
    return { allowed: false, reason: "تاريخ انتهاء الجواز غير صالح. الصيغة المطلوبة: YYYY-MM-DD." };
  }

  if (birth >= today) {
    return { allowed: false, reason: "تاريخ الميلاد غير صالح (يجب أن يكون في الماضي)." };
  }

  const isExpired = expiry < today;
  if (isExpired) {
    return {
      allowed: false,
      isExpired: true,
      reason: "لا يمكن اعتماد جواز سفر منتهي الصلاحية. يجب تجديد الجواز أولاً."
    };
  }

  return {
    allowed: true,
    isExpired,
    normalizedData: {
      passportNumber: passNo,
      firstName: fName,
      lastName: lName,
      birthDate: birthIso,
      expiryDate: expiryIso
    }
  };
}
