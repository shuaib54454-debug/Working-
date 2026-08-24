import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  User,
  Phone,
  Briefcase,
  Globe,
  FileCheck,
  Calendar,
  DollarSign,
  Building2
} from "lucide-react";
import { Candidate, StageId } from "../types";
import { STAGES } from "../data/initialData";

interface EditCandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  onSave: (id: string, updates: Partial<Candidate>) => void;
}

export const EditCandidateModal: React.FC<EditCandidateModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSave
}) => {
  const [formData, setFormData] = useState<Partial<Candidate>>({
    firstName: candidate.firstName,
    lastName: candidate.lastName,
    phone: candidate.phone,
    secondPhone: candidate.secondPhone || "",
    gender: candidate.gender,
    dateOfBirth: candidate.dateOfBirth || "",
    address: candidate.address || "",
    city: candidate.city || "",
    job: candidate.job,
    country: candidate.country,
    passportNumber: candidate.passportNumber || "",
    passportIssueDate: candidate.passportIssueDate || "",
    passportExpiryDate: candidate.passportExpiryDate || "",
    cocNumber: candidate.cocNumber || "",
    cocStatus: candidate.cocStatus || "لم يختبر بعد",
    cocIssueDate: candidate.cocIssueDate || "",
    stage: candidate.stage,
    totalFees: candidate.totalFees,
    agencyLiability: candidate.agencyLiability || 0,
    agentName: candidate.agentName || "",
    sponsorName: candidate.sponsorName || "",
    notes: candidate.notes || "",
    medicalStatus: candidate.medicalStatus || "",
    trainingStatus: candidate.trainingStatus || "",
    visaStatus: candidate.visaStatus || "",
    visaNumber: candidate.visaNumber || "",
    flightStatus: candidate.flightStatus || "",
    flightDate: candidate.flightDate || "",
    flightTicketNumber: candidate.flightTicketNumber || ""
  });

  React.useEffect(() => {
    if (candidate) {
      setFormData({
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        phone: candidate.phone,
        secondPhone: candidate.secondPhone || "",
        gender: candidate.gender,
        dateOfBirth: candidate.dateOfBirth || "",
        address: candidate.address || "",
        city: candidate.city || "",
        job: candidate.job,
        country: candidate.country,
        passportNumber: candidate.passportNumber || "",
        passportIssueDate: candidate.passportIssueDate || "",
        passportExpiryDate: candidate.passportExpiryDate || "",
        cocNumber: candidate.cocNumber || "",
        cocStatus: candidate.cocStatus || "لم يختبر بعد",
        cocIssueDate: candidate.cocIssueDate || "",
        stage: candidate.stage,
        totalFees: candidate.totalFees,
        agencyLiability: candidate.agencyLiability || 0,
        agentName: candidate.agentName || "",
        sponsorName: candidate.sponsorName || "",
        notes: candidate.notes || "",
        medicalStatus: candidate.medicalStatus || "",
        trainingStatus: candidate.trainingStatus || "",
        visaStatus: candidate.visaStatus || "",
        visaNumber: candidate.visaNumber || "",
        flightStatus: candidate.flightStatus || "",
        flightDate: candidate.flightDate || "",
        flightTicketNumber: candidate.flightTicketNumber || ""
      });
    }
  }, [candidate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(candidate.id, {
      ...formData,
      totalFees: Number(formData.totalFees || 0),
      agencyLiability: Number(formData.agencyLiability || 0)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#fdfcfb] w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#172a46] text-white p-5 sm:p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black">تعديل ملف المرشح: {candidate.firstName} {candidate.lastName}</h3>
            <span className="text-xs text-stone-300">الرقم المرجعي: <strong className="text-[#c9a84c] font-mono">{candidate.id}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 bg-white">
          {/* Personal Info */}
          <div>
            <h4 className="text-xs font-black text-[#172a46] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-stone-100 pb-2">
              <User className="w-4 h-4 text-[#c9a84c]" />
              البيانات الشخصية والاتصال
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">الاسم الأول *</label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">اسم العائلة / اللقب *</label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">رقم الهاتف الأساسي *</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c] text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">رقم هاتف إضافي (اختياري)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={formData.secondPhone}
                  onChange={e => setFormData({ ...formData, secondPhone: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c] text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">الجنس</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                >
                  <option value="female">أنثى</option>
                  <option value="male">ذكر</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">تاريخ الميلاد</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-600 mb-1">العنوان / المدينة</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>
            </div>
          </div>

          {/* Job & Destination */}
          <div>
            <h4 className="text-xs font-black text-[#172a46] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-stone-100 pb-2">
              <Briefcase className="w-4 h-4 text-[#c9a84c]" />
              المهنة والوجهة وأتعاب الوكالة
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">المهنة / الوظيفة *</label>
                <input
                  type="text"
                  required
                  value={formData.job}
                  onChange={e => setFormData({ ...formData, job: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">دولة العمل / الوجهة *</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={e => setFormData({ ...formData, country: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">إجمالي الأتعاب والرسوم *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.totalFees}
                  onChange={e => setFormData({ ...formData, totalFees: Number(e.target.value) })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1">سداد مستحقات على الوكالة (خصم من الأتعاب)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.agencyLiability}
                  onChange={e => setFormData({ ...formData, agencyLiability: Number(e.target.value) })}
                  className="w-full p-2.5 bg-amber-50/50 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">المرحلة الحالية</label>
                <select
                  value={formData.stage}
                  onChange={e => setFormData({ ...formData, stage: e.target.value as StageId })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                >
                  {STAGES.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">اسم المندوب / الوسيط</label>
                <input
                  type="text"
                  value={formData.agentName}
                  onChange={e => setFormData({ ...formData, agentName: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">اسم الكفيل / صاحب العمل</label>
                <input
                  type="text"
                  value={formData.sponsorName}
                  onChange={e => setFormData({ ...formData, sponsorName: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>
            </div>
          </div>

          {/* Passport & Travel Info */}
          <div>
            <h4 className="text-xs font-black text-[#172a46] uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-stone-100 pb-2">
              <FileCheck className="w-4 h-4 text-[#c9a84c]" />
              بيانات جواز السفر والتأشيرة
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">رقم جواز السفر</label>
                <input
                  type="text"
                  value={formData.passportNumber}
                  onChange={e => setFormData({ ...formData, passportNumber: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">تاريخ إصدار الجواز</label>
                <input
                  type="date"
                  value={formData.passportIssueDate}
                  onChange={e => setFormData({ ...formData, passportIssueDate: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">تاريخ انتهاء الجواز</label>
                <input
                  type="date"
                  value={formData.passportExpiryDate}
                  onChange={e => setFormData({ ...formData, passportExpiryDate: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>
            </div>
          </div>

          {/* COC Certificate Section */}
          <div className="bg-[#172a46]/5 border border-[#172a46]/10 p-4 rounded-2xl space-y-3">
            <h4 className="text-xs font-black text-[#172a46] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#172a46]/10 pb-2">
              <FileCheck className="w-4 h-4 text-[#c9a84c]" />
              شهادة الكفاءة المهنية (COC - Certificate of Competence)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">رقم شهادة COC</label>
                <input
                  type="text"
                  placeholder="مثال: COC-ETH-2024-8891"
                  value={formData.cocNumber}
                  onChange={e => setFormData({ ...formData, cocNumber: e.target.value })}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">حالة شهادة COC</label>
                <select
                  value={formData.cocStatus}
                  onChange={e => setFormData({ ...formData, cocStatus: e.target.value })}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                >
                  <option value="لم يختبر بعد">لم يختبر بعد</option>
                  <option value="قيد الاختبار والتقييم">قيد الاختبار والتقييم</option>
                  <option value="بانتظار ظهور النتيجة">بانتظار ظهور النتيجة</option>
                  <option value="معتمد ومجتاز (Pass)">معتمد ومجتاز (Pass)</option>
                  <option value="غير مجتاز (Fail)">غير مجتاز (Fail)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-600 mb-1">تاريخ إصدار الشهادة</label>
                <input
                  type="date"
                  value={formData.cocIssueDate}
                  onChange={e => setFormData({ ...formData, cocIssueDate: e.target.value })}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1">ملاحظات إدارية وخاصة</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
              placeholder="أدخل أي ملاحظات حول المقابلة أو الشروط أو المهارات..."
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-stone-200 text-xs font-black text-stone-600 hover:bg-stone-50 transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-2xl bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] text-xs font-black shadow-md flex items-center gap-2 transition-transform active:scale-95"
            >
              <Save className="w-4 h-4" />
              حفظ التعديلات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
