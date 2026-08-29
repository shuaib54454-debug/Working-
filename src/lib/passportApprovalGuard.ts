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
  "null",
  "p0000000"
]);

const isPlaceholder = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return !normalized || PLACEHOLDERS.has(normalized);
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

  const birth = new Date(`${input.birthDate}T00:00:00Z`);
  const expiry = new Date(`${input.expiryDate}T00:00:00Z`);
  const today = new Date(`${input.today ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`);

  if (Number.isNaN(birth.getTime()) || Number.isNaN(expiry.getTime()) || Number.isNaN(today.getTime())) {
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
