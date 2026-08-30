export interface PassportApprovalInput {
  hasVerifiedMrz: boolean;
  passportNumber: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  expiryDate: string;
  today?: string;
}

export interface PassportApprovalResult {
  allowed: boolean;
  reason?: string;
}

const PLACEHOLDERS = new Set([
  "المرشح",
  "candidate",
  "unknown",
  "undefined",
  "null"
]);

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const isPlaceholder = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (/^p0{7}$/i.test(normalized)) return true;
  return !normalized || PLACEHOLDERS.has(normalized);
};

const parseStrictDate = (value: string): Date | null => {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
};

export function canApprovePassportData(input: PassportApprovalInput): PassportApprovalResult {
  if (!input.hasVerifiedMrz) {
    return { allowed: false, reason: "لا يمكن اعتماد بيانات الجواز قبل نجاح التحقق من MRZ." };
  }

  if ([input.passportNumber, input.firstName, input.lastName, input.birthDate, input.expiryDate].some(isPlaceholder)) {
    return { allowed: false, reason: "بيانات الجواز غير مكتملة أو تحتوي على قيم افتراضية." };
  }

  const passportNumber = input.passportNumber.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(passportNumber)) {
    return { allowed: false, reason: "رقم الجواز غير صالح." };
  }

  const birth = parseStrictDate(input.birthDate);
  const expiry = parseStrictDate(input.expiryDate);
  const todayValue = input.today ?? new Date().toISOString().slice(0, 10);
  const today = parseStrictDate(todayValue);

  if (!birth || !expiry || !today) {
    return { allowed: false, reason: "تاريخ الميلاد أو انتهاء الجواز غير صالح." };
  }

  if (birth >= today) {
    return { allowed: false, reason: "تاريخ الميلاد غير صالح." };
  }

  if (expiry < today) {
    return { allowed: false, reason: "الجواز منتهي الصلاحية." };
  }

  return { allowed: true };
}
