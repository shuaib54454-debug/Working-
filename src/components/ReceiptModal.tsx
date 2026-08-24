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
  const title = isReceiptPayment ? "سند قبض رسمي (Payment Receipt)" : "سند صرف رسمي (Expense Voucher)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-[#fdfcfb] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200 flex flex-col max-h-[90vh]">
        {/* Modal Controls Header (hidden on print) */}
        <div className="bg-[#172a46] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-[#c9a84c]" />
            <h3 className="font-black text-sm">معاينة وطباعة السند الرسمي</h3>
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
              <span>{isExportingPDF ? "جاري إنشاء PDF..." : "تحميل PDF"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-[#c9a84c] hover:bg-[#d8b759] text-[#172a46] px-3.5 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95"
            >
              <Printer className="w-4 h-4" />
              طباعة
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
            <div className="flex items-start gap-3 text-right">
              <ShuaybLogo size="lg" variant="icon" />
              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-[#172a46]">{settings.agencyName}</h2>
                <p className="text-xs text-[#8B262A] font-bold">{settings.agencySubtitle || "مكتب تسهيل خدمات وتسويق المنتجات الزراعية وغيرها الإثيوبية"}</p>
                <p className="text-[11px] text-stone-500">ترخيص: {settings.licenseNumber || "LIC-ETH-2024-STB990"} | هاتف: {settings.phone}</p>
                <p className="text-[11px] text-stone-500">{settings.address}</p>
              </div>
            </div>

            <div className="text-left space-y-1 shrink-0">
              <div className="inline-block px-3 py-1 bg-[#172a46] text-white rounded-xl text-xs font-black">
                {title}
              </div>
              <div className="text-xs font-mono font-bold text-stone-700 mt-1">
                رقم السند: <strong className="text-[#c9a84c]">{receipt.receiptNumber}</strong>
              </div>
              <div className="text-xs text-stone-500">
                التاريخ: {receipt.date}
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="bg-stone-50 border-2 border-dashed border-[#c9a84c] p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500 font-bold block mb-1">
                {isReceiptPayment ? "المبلغ المقبوض" : "المبلغ المصروف"}
              </span>
              <span className="text-2xl font-black text-[#172a46] font-mono">
                {formatMoney(receipt.amount, settings.currency)}
              </span>
            </div>
            {receipt.paymentMethod && (
              <div className="text-left">
                <span className="text-xs text-stone-500 font-bold block mb-1">طريقة الدفع</span>
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
                {isReceiptPayment ? "استلمنا من السيد/ة:" : "صرف لأمر / بخصوص:"}
              </span>
              <span className="font-black text-sm text-[#172a46] block">{receipt.candidateName}</span>
              <span className="text-[11px] text-stone-500 block font-mono">الرقم المرجعي: {receipt.candidateId}</span>
              {receipt.candidateJob && (
                <span className="text-[11px] text-stone-500 block">المهنة: {receipt.candidateJob}</span>
              )}
            </div>

            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 space-y-1">
              <span className="text-stone-400 font-bold block">البيان والتفاصيل:</span>
              <span className="font-bold text-stone-700 block">
                {receipt.category ? `بند: ${receipt.category}` : isReceiptPayment ? "دفعة من رسوم وأتعاب التوظيف" : "مصروفات ومعاملات إدارية"}
              </span>
              {receipt.note && (
                <span className="text-[11px] text-stone-600 block italic">ملاحظات: {receipt.note}</span>
              )}
              {receipt.remainingBalance !== undefined && (
                <span className="text-[11px] text-rose-600 font-black block pt-1 border-t border-stone-200 font-mono">
                  المتبقي بذمته: {formatMoney(receipt.remainingBalance, settings.currency)}
                </span>
              )}
            </div>
          </div>

          {/* Signatures & Stamp area */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-stone-200 text-center text-xs">
            <div className="space-y-8">
              <span className="font-bold text-stone-500">المحاسب / المستلم</span>
              <div className="border-b border-stone-300 w-3/4 mx-auto" />
            </div>

            <div className="space-y-8">
              <span className="font-bold text-stone-500">توقيع العميل / المستفيد</span>
              <div className="border-b border-stone-300 w-3/4 mx-auto" />
            </div>

            <div className="space-y-2">
              <span className="font-bold text-stone-500">ختم الوكالة المعتمد</span>
              <div className="w-20 h-20 border-2 border-dashed border-stone-300 rounded-full mx-auto flex items-center justify-center text-[10px] text-stone-400">
                ختم الإدارة
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-stone-400 pt-4 border-t border-stone-100">
            تعتبر هذه الوثيقة إشعاراً رسمياً من {settings.agencyName} - صدرت بتاريخ {new Date().toLocaleDateString('ar-EG')}
          </div>
        </div>
      </div>
    </div>
  );
};
