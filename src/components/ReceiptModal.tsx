import React, { useState } from "react";
import {
  Printer,
  X,
  Building2,
  CheckCircle2,
  Calendar,
  CreditCard,
  FileText,
  User,
  ShieldCheck,
  Download,
  Loader2
} from "lucide-react";
import { AgencySettings } from "../types";
import { formatMoney } from "../data/initialData";
import { exportElementToPDF } from "../lib/pdfUtils";
import { ShuaybLogo } from "./ShuaybLogo";
import { useLanguage } from "../lib/LanguageContext";

export interface ReceiptData {
  type: "PAYMENT" | "EXPENSE"; // سند قبض (Payment) أو سند صرف (Expense)
  receiptNumber: string;
  candidateName: string;
  candidateId: string;
  candidateJob?: string;
  amount: number;
  date: string;
  category?: string;
  paymentMethod?: string;
  note?: string;
  remainingBalance?: number;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptData | null;
  settings: AgencySettings;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  settings
}) => {
  const { isAr } = useLanguage();
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setIsExportingPDF(true);
    try {
      const typeStr = receipt.type === "PAYMENT" ? "Receipt" : "Voucher";
      const filename = `Shuayb-${typeStr}-${receipt.receiptNumber || "voucher"}.pdf`;
      await exportElementToPDF("printable-receipt", {
        filename,
        orientation: "portrait",
        scale: 2
      });
    } catch (err) {
      console.error("Receipt PDF export failed:", err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const isReceiptPayment = receipt.type === "PAYMENT";
  const title = isAr
    ? isReceiptPayment
      ? "سند قبض رسمي (Payment Receipt)"
      : "سند صرف رسمي (Expense Voucher)"
    : isReceiptPayment
    ? "Official Payment Receipt"
    : "Official Expense Voucher";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#fdfcfb] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]">
        {/* Modal Controls Header (hidden on print) */}
        <div className="bg-[#172a46] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-[#c9a84c]" />
            <h3 className="font-black text-sm">
              {isAr ? "معاينة وطباعة السند الرسمي" : "Official Receipt Preview & Print"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="bg-[#8B262A] hover:bg-[#a02c31] disabled:opacity-50 text-white px-3.5 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              {isExportingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#c9a84c]" />
              ) : (
                <Download className="w-4 h-4 text-[#c9a84c]" />
              )}
              <span>{isExportingPDF ? (isAr ? "جاري إنشاء PDF..." : "Exporting PDF...") : (isAr ? "تحميل PDF" : "Download PDF")}</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] px-3.5 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <Printer className="w-4 h-4" />
              {isAr ? "طباعة" : "Print"}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl hover:bg-white/10 text-stone-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Area */}
        <div id="printable-receipt" className="p-6 sm:p-8 overflow-y-auto space-y-6 text-[#1a1c1e] bg-white">
          {/* Header with Agency Branding */}
          <div className="flex justify-between items-start border-b-2 border-[#172a46] pb-4">
            <div className="flex items-start gap-3 text-start">
              <ShuaybLogo size="lg" variant="icon" />
              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-[#172a46]">{settings.agencyName}</h2>
                <p className="text-xs text-[#8B262A] font-bold">
                  {settings.agencySubtitle || (isAr ? "مكتب تسهيل خدمات وتسويق المنتجات الزراعية وغيرها الإثيوبية" : "Ethiopian Agricultural & Labor Services Agency")}
                </p>
                <p className="text-[11px] text-stone-500">
                  {isAr ? "ترخيص:" : "License:"} {settings.licenseNumber || "LIC-ETH-2024-STB990"} | {isAr ? "هاتف:" : "Tel:"} {settings.phone}
                </p>
                <p className="text-[11px] text-stone-500">{settings.address}</p>
              </div>
            </div>

            <div className="text-end space-y-1 shrink-0">
              <div className="inline-block px-3 py-1 bg-[#172a46] text-white rounded-xl text-xs font-black">
                {title}
              </div>
              <div className="text-xs font-mono font-bold text-stone-700 mt-1">
                {isAr ? "رقم السند:" : "Voucher #:"} <strong className="text-[#c9a84c]">{receipt.receiptNumber}</strong>
              </div>
              <div className="text-xs text-stone-500">
                {isAr ? "التاريخ:" : "Date:"} {receipt.date}
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="bg-stone-50 border-2 border-dashed border-[#c9a84c] p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500 font-bold block mb-1">
                {isReceiptPayment ? (isAr ? "المبلغ المقبوض" : "Amount Received") : (isAr ? "المبلغ المصروف" : "Amount Disbursed")}
              </span>
              <span className="text-2xl font-black text-[#172a46] font-mono">
                {formatMoney(receipt.amount, settings.currency)}
              </span>
            </div>
            {receipt.paymentMethod && (
              <div className="text-end">
                <span className="text-xs text-stone-500 font-bold block mb-1">
                  {isAr ? "طريقة الدفع" : "Payment Method"}
                </span>
                <span className="px-3.5 py-1 bg-white border border-stone-200 rounded-full text-xs font-black text-stone-800 shadow-xs">
                  {receipt.paymentMethod}
                </span>
              </div>
            )}
          </div>

          {/* Candidate & Transaction Details */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-stone-400 font-bold block">
                {isReceiptPayment ? (isAr ? "استلمنا من السيد/ة:" : "Received From:") : (isAr ? "صرف لأمر / بخصوص:" : "Paid For:")}
              </span>
              <span className="font-black text-sm text-[#172a46] block">{receipt.candidateName}</span>
              <span className="text-[11px] text-stone-500 block font-mono">
                {isAr ? "الرقم المرجعي:" : "Ref ID:"} {receipt.candidateId}
              </span>
              {receipt.candidateJob && (
                <span className="text-[11px] text-stone-500 block">
                  {isAr ? "المهنة:" : "Job:"} {receipt.candidateJob}
                </span>
              )}
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-stone-400 font-bold block">{isAr ? "البيان والتفاصيل:" : "Description & Details:"}</span>
              <span className="font-bold text-stone-700 block">
                {receipt.category
                  ? `${isAr ? "بند: " : "Category: "}${receipt.category}`
                  : isReceiptPayment
                  ? (isAr ? "دفعة من رسوم وأتعاب التوظيف" : "Recruitment fees payment installment")
                  : (isAr ? "مصروفات ومعاملات إدارية" : "Administrative & processing expense")}
              </span>
              {receipt.note && (
                <span className="text-[11px] text-stone-600 block italic">
                  {isAr ? "ملاحظات: " : "Notes: "}{receipt.note}
                </span>
              )}
              {receipt.remainingBalance !== undefined && (
                <span className="text-[11px] text-rose-600 font-black block pt-1 border-t border-stone-200 font-mono">
                  {isAr ? "المتبقي بذمته: " : "Remaining Balance: "}
                  {formatMoney(receipt.remainingBalance, settings.currency)}
                </span>
              )}
            </div>
          </div>

          {/* Signatures & Stamp area */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-stone-200 text-center text-xs">
            <div className="space-y-8">
              <span className="font-bold text-stone-500">
                {isAr ? "المحاسب / المستلم" : "Accountant / Received By"}
              </span>
              <div className="border-b border-stone-300 w-3/4 mx-auto" />
            </div>

            <div className="space-y-8">
              <span className="font-bold text-stone-500">
                {isAr ? "توقيع العميل / المستفيد" : "Client / Beneficiary"}
              </span>
              <div className="border-b border-stone-300 w-3/4 mx-auto" />
            </div>

            <div className="space-y-2">
              <span className="font-bold text-stone-500">
                {isAr ? "ختم الوكالة المعتمد" : "Official Agency Stamp"}
              </span>
              <div className="w-20 h-20 border-2 border-dashed border-stone-300 rounded-full mx-auto flex items-center justify-center text-[10px] text-stone-400">
                {isAr ? "ختم الإدارة" : "Agency Seal"}
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-stone-400 pt-4 border-t border-stone-100">
            {isAr
              ? `تعتبر هذه الوثيقة إشعاراً رسمياً من ${settings.agencyName} - صدرت بتاريخ ${new Date().toLocaleDateString('ar-EG')}`
              : `Official document issued by ${settings.agencyName} - Issued on ${new Date().toLocaleDateString('en-US')}`}
          </div>
        </div>
      </div>
    </div>
  );
};
