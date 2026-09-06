import React, { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  FileCheck,
  Stethoscope,
  GraduationCap,
  Plane,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Eye,
  Trash2,
  Copy,
  Check,
  FilePlus,
  Sparkles,
  Loader2,
  X
} from "lucide-react";
import { Candidate, CandidateNoteEntry } from "../types";
import { WorkerStorageFolder } from "../lib/firebase";

interface CandidateDocumentsAndNotesProps {
  candidate: Candidate;
  onUpdate: (id: string, updates: Partial<Candidate>) => void;
  setActivePreviewDoc: (doc: {
    id?: string;
    title: string;
    url: string;
    isPdf: boolean;
    folder: WorkerStorageFolder;
    fileName?: string;
  } | null) => void;
  uploadingFolder: WorkerStorageFolder | null;
  uploadError: string | null;
  uploadSuccess: string | null;
  handleFileUpload: (
    folder: WorkerStorageFolder,
    e: React.ChangeEvent<HTMLInputElement>,
    customTitle?: string
  ) => Promise<void>;
  handleDeleteDocument: (folder: WorkerStorageFolder, targetDocId?: string) => Promise<void>;
  copiedDocId: string | null;
  handleCopyDocId: (id: string, e?: React.MouseEvent) => void;
}

export const CandidateDocumentsAndNotes: React.FC<CandidateDocumentsAndNotesProps> = ({
  candidate,
  onUpdate,
  setActivePreviewDoc,
  uploadingFolder,
  uploadError,
  uploadSuccess,
  handleFileUpload,
  handleDeleteDocument,
  copiedDocId,
  handleCopyDocId
}) => {
  const [showAddOtherDocModal, setShowAddOtherDocModal] = useState(false);
  const [otherDocTitle, setOtherDocTitle] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedTime, setNotesSavedTime] = useState<string | null>(null);
  const [quickNoteText, setQuickNoteText] = useState("");
  const [selectedDocIdForNote, setSelectedDocIdForNote] = useState<string>("");

  const handleSaveNotes = () => {
    setNotesSaving(true);
    onUpdate(candidate.id, { notes: candidate.notes || "" });
    setTimeout(() => {
      setNotesSaving(false);
      const timeStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
      setNotesSavedTime(timeStr);
    }, 350);
  };

  const handleAddQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteText.trim()) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
    const timeStr = now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
    const noteId = `NOTE-${Date.now().toString(36).toUpperCase()}`;

    const docTag = selectedDocIdForNote ? ` [مرتبط بالوثيقة: ${selectedDocIdForNote}]` : "";
    const newLine = `• [${dateStr} ${timeStr}] ${quickNoteText.trim()}${docTag}`;

    const updatedNotes = candidate.notes?.trim()
      ? `${candidate.notes.trim()}\n${newLine}`
      : newLine;

    const newEntry: CandidateNoteEntry = {
      id: noteId,
      date: `${dateStr} ${timeStr}`,
      text: quickNoteText.trim(),
      referencedDocId: selectedDocIdForNote || undefined
    };

    onUpdate(candidate.id, {
      notes: updatedNotes,
      noteEntries: [...(candidate.noteEntries || []), newEntry]
    });

    setQuickNoteText("");
    setSelectedDocIdForNote("");
    setNotesSavedTime(timeStr);
  };

  const cleanCandidateId = (candidate.id || "CAND").replace(/[^a-zA-Z0-9_-]/g, "_");

  const coreDocs = [
    {
      folder: "passport" as WorkerStorageFolder,
      title: "صورة جواز السفر",
      description: "وثيقة السفر الرسمية لبيانات المرشح وتأكيد الهوية وتاريخ الصلاحية.",
      url: candidate.passportImageUrl,
      storagePath: candidate.passportStoragePath,
      docId: candidate.passportDocId || (candidate.passportImageUrl ? `DOC-${cleanCandidateId}-PASSPORT` : null),
      icon: FileText,
      accept: "image/*,application/pdf"
    },
    {
      folder: "photo" as WorkerStorageFolder,
      title: "الصورة الشخصية الرسمية",
      description: "صورة حديثة بخلفية بيضاء للاستخدام في السيرة الذاتية والمعاملات الحكومية.",
      url: candidate.photoUrl,
      storagePath: candidate.photoStoragePath,
      docId: candidate.photoDocId || (candidate.photoUrl ? `DOC-${cleanCandidateId}-PHOTO` : null),
      icon: ImageIcon,
      accept: "image/*"
    },
    {
      folder: "contract" as WorkerStorageFolder,
      title: "عقد العمل والاتفاقية",
      description: "نسخة عقد العمل المعتمدة الموقعة بين صاحب العمل والمرشح والمكتب.",
      url: candidate.contractUrl,
      storagePath: candidate.contractStoragePath,
      docId: candidate.contractDocId || (candidate.contractUrl ? `DOC-${cleanCandidateId}-CONTRACT` : null),
      icon: FileCheck,
      accept: "image/*,application/pdf"
    },
    {
      folder: "medical" as WorkerStorageFolder,
      title: "التقرير الطبي المعتمد",
      description: "شهادة الكشف الطبي الصادرة من المراكز المعتمدة (وافق / لائق طبياً).",
      url: candidate.medicalUrl,
      storagePath: candidate.medicalStoragePath,
      docId: candidate.medicalDocId || (candidate.medicalUrl ? `DOC-${cleanCandidateId}-MEDICAL` : null),
      icon: Stethoscope,
      accept: "image/*,application/pdf"
    },
    {
      folder: "coc" as WorkerStorageFolder,
      title: "شهادة الكفاءة المهنية (COC)",
      description: "شهادة اجتياز الفحص المهني والتدريب العملي للمهن التخصصية المعتمدة.",
      url: candidate.cocImageUrl,
      storagePath: candidate.cocStoragePath,
      docId: candidate.cocDocId || (candidate.cocImageUrl ? `DOC-${cleanCandidateId}-COC` : null),
      icon: GraduationCap,
      accept: "image/*,application/pdf"
    },
    {
      folder: "visa" as WorkerStorageFolder,
      title: "تأشيرة الدخول (الفيزا)",
      description: "صورة التأشيرة الصادرة من منصة مساند أو وزارة الموارد البشرية.",
      url: candidate.visaUrl,
      storagePath: candidate.visaStoragePath,
      docId: candidate.visaDocId || (candidate.visaUrl ? `DOC-${cleanCandidateId}-VISA` : null),
      icon: Plane,
      accept: "image/*,application/pdf"
    }
  ];

  const additionalDocs = (candidate.uploadedDocuments || []).filter(d => d.folder === "documents");
  const uploadedCount = coreDocs.filter(d => Boolean(d.url || d.storagePath)).length;

  return (
    <div id="candidate-docs-and-notes-tab" className="space-y-6 animate-in fade-in">
      {/* Cloud Storage Documents Section */}
      <div id="candidate-documents-card" className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h3 id="candidate-documents-heading" className="font-black text-sm sm:text-base text-[#172a46] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#c9a84c]" />
              <span>أرشيف وثائق المرشح ومعرّفات الأرشفة (Document IDs)</span>
            </h3>
            <p className="text-[11px] text-stone-400 mt-0.5">
              يتم إصدار معرّف رقمي فريد (ID) لكل وثيقة مرفوعة لتوثيق وتتبع المعاملات الإدارية بدقة.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span id="doc-completion-badge" className="text-[11px] font-bold bg-[#172a46]/5 text-[#172a46] px-2.5 py-1 rounded-xl border border-[#172a46]/10">
              {uploadedCount} من 6 وثائق أساسية
            </span>
            <span id="candidate-storage-path-badge" className="text-[10px] sm:text-[11px] font-mono font-bold bg-stone-100 text-stone-600 px-2.5 py-1 rounded-xl border border-stone-200" dir="ltr">
              workers/{candidate.id}/
            </span>
            <button
              id="btn-open-add-other-doc"
              type="button"
              onClick={() => setShowAddOtherDocModal(true)}
              className="px-3 py-1.5 bg-[#172a46] hover:bg-[#203a60] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <FilePlus className="w-3.5 h-3.5 text-[#c9a84c]" />
              <span>إضافة وثيقة أخرى</span>
            </button>
          </div>
        </div>

        {uploadError && (
          <div id="documents-upload-error" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div id="documents-upload-success" className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{uploadSuccess}</span>
            </div>
          </div>
        )}

        {/* Core 6 Documents Grid */}
        <div id="core-documents-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          {coreDocs.map((doc) => {
            const isUploaded = Boolean(doc.url || doc.storagePath);
            const isUploading = uploadingFolder === doc.folder;
            const DocIcon = doc.icon;

            return (
              <div
                key={doc.folder}
                id={`doc-card-${doc.folder}`}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-between gap-3 shadow-2xs hover:border-[#c9a84c]/50 transition-all duration-200"
              >
                <div className="space-y-2.5">
                  {/* Card Header: Icon + Title + Status Pill */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-xl bg-white text-[#c9a84c] border border-stone-200 shrink-0">
                        <DocIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-stone-800 truncate">{doc.title}</span>
                    </div>
                    {isUploaded ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>مرفوع</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-200/80 text-stone-600 shrink-0">
                        غير متوفر
                      </span>
                    )}
                  </div>

                  {/* Document ID Pill */}
                  {isUploaded && doc.docId ? (
                    <div
                      id={`doc-id-box-${doc.folder}`}
                      className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-bold text-amber-800 shrink-0">معرّف الوثيقة:</span>
                        <span
                          id={`doc-id-text-${doc.folder}`}
                          className="font-mono font-bold text-[#172a46] text-[10px] truncate select-all"
                          dir="ltr"
                        >
                          {doc.docId}
                        </span>
                      </div>
                      <button
                        id={`btn-copy-doc-id-${doc.folder}`}
                        type="button"
                        onClick={(e) => handleCopyDocId(doc.docId!, e)}
                        className="shrink-0 px-1.5 py-0.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 transition-colors border border-amber-200 flex items-center gap-1 text-[10px] font-bold"
                        title="نسخ معرّف الوثيقة"
                      >
                        {copiedDocId === doc.docId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                            <span className="text-emerald-700">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-stone-500" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-stone-400 italic px-1">
                      سيتم توليد معرّف فريد للوثيقة (DOC-ID) فور رفع الملف
                    </div>
                  )}

                  <p className="text-[11px] text-stone-500 leading-relaxed">{doc.description}</p>
                </div>

                {/* Actions Toolbar */}
                <div id={`doc-card-actions-${doc.folder}`} className="pt-2 border-t border-stone-200/80 flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 hover:border-[#172a46] rounded-xl text-xs font-bold text-stone-700 cursor-pointer transition-colors shadow-2xs">
                    {isUploading ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#c9a84c] animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#c9a84c]" />
                    )}
                    <span>{isUploading ? "جاري الحفظ..." : isUploaded ? "استبدال الملف" : "رفع الملف"}</span>
                    <input
                      id={`file-input-${doc.folder}`}
                      type="file"
                      accept={doc.accept}
                      disabled={isUploading}
                      onChange={e => handleFileUpload(doc.folder, e)}
                      className="hidden"
                    />
                  </label>

                  {isUploaded && doc.url && (
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-preview-doc-${doc.folder}`}
                        type="button"
                        onClick={() =>
                          setActivePreviewDoc({
                            id: doc.docId || undefined,
                            title: doc.title,
                            url: doc.url!,
                            isPdf: doc.url!.startsWith("data:application/pdf") || doc.url!.includes(".pdf"),
                            folder: doc.folder
                          })
                        }
                        className="px-2.5 py-1.5 bg-[#172a46] text-white hover:bg-[#203a60] rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                        title="معاينة الوثيقة"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#c9a84c]" />
                        <span>معاينة</span>
                      </button>
                      <button
                        id={`btn-delete-doc-${doc.folder}`}
                        type="button"
                        onClick={() => handleDeleteDocument(doc.folder, doc.docId || undefined)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors"
                        title="حذف الوثيقة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Documents Sub-section */}
        <div id="additional-documents-section" className="pt-4 border-t border-stone-100">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-xs sm:text-sm text-stone-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-stone-400" />
              <span>وثائق ومرفقات إضافية أخرى</span>
              {additionalDocs.length > 0 && (
                <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full text-[10px] font-bold">
                  {additionalDocs.length}
                </span>
              )}
            </h4>
          </div>

          {additionalDocs.length > 0 ? (
            <div id="additional-documents-list" className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {additionalDocs.map((otherDoc) => (
                <div
                  key={otherDoc.id}
                  id={`additional-doc-${otherDoc.id}`}
                  className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-800 text-xs truncate">{otherDoc.title}</span>
                      <span className="px-1.5 py-0.5 bg-stone-200/70 text-stone-600 rounded text-[9px] font-mono uppercase">
                        {otherDoc.fileType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-stone-500">
                      <span className="text-[#172a46] font-bold" dir="ltr">{otherDoc.id}</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyDocId(otherDoc.id, e)}
                        className="p-0.5 text-stone-400 hover:text-stone-700 transition-colors"
                        title="نسخ المعرف"
                      >
                        {copiedDocId === otherDoc.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    {otherDoc.uploadedAt && (
                      <div className="text-[10px] text-stone-400">
                        تاريخ الرفع: {new Date(otherDoc.uploadedAt).toLocaleDateString("ar-SA")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setActivePreviewDoc({
                          id: otherDoc.id,
                          title: otherDoc.title,
                          url: otherDoc.url,
                          isPdf: otherDoc.fileType === "pdf",
                          folder: "documents",
                          fileName: otherDoc.fileName
                        })
                      }
                      className="px-2.5 py-1.5 bg-[#172a46] text-white hover:bg-[#203a60] rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#c9a84c]" />
                      <span>معاينة</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument("documents", otherDoc.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl"
                      title="حذف الوثيقة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-stone-200 text-center text-xs text-stone-400">
              لا توجد وثائق إضافية مرفوعة بعد. يمكنك النقر على &quot;إضافة وثيقة أخرى&quot; بالأعلى لرفع شهادات أو تفويضات بمعرفات مخصصة.
            </div>
          )}
        </div>
      </div>

      {/* Notes & Administrative Log Section */}
      <div id="candidate-notes-section" className="bg-white p-6 rounded-3xl border border-stone-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#c9a84c]" />
            <h3 id="candidate-notes-title" className="font-black text-sm text-[#172a46]">
              الملاحظات وسجل المتابعة الإدارية
            </h3>
          </div>
          <div id="candidate-notes-save-status" className="flex items-center gap-2">
            {notesSaving ? (
              <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                <span>جاري الحفظ بالسحابة...</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>تم الحفظ في السحابة {notesSavedTime ? `• ${notesSavedTime}` : ""}</span>
              </span>
            )}
          </div>
        </div>

        {/* Quick Note Ingestion Form with Optional Document ID Tagging */}
        <form
          id="quick-note-form"
          onSubmit={handleAddQuickNote}
          className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-2xl space-y-2.5"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
            <Sparkles className="w-4 h-4 text-[#c9a84c]" />
            <span>إضافة إجراء إداري أو ملحوظة مؤرخة سريعة:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="quick-note-text-input"
              type="text"
              value={quickNoteText}
              onChange={e => setQuickNoteText(e.target.value)}
              placeholder="مثال: تم تسليم الجواز للقنصلية، أو صدور نتيجة الفحص الطبي..."
              className="flex-1 p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
            />

            {/* Optional Document Link dropdown */}
            <select
              id="quick-note-doc-select"
              value={selectedDocIdForNote}
              onChange={e => setSelectedDocIdForNote(e.target.value)}
              className="p-2.5 bg-white border border-stone-200 rounded-xl text-[11px] font-bold text-stone-700 outline-none focus:ring-2 focus:ring-[#c9a84c]"
            >
              <option value="">بدون ربط بوثيقة</option>
              {candidate.passportImageUrl && (
                <option value={candidate.passportDocId || `DOC-${cleanCandidateId}-PASSPORT`}>
                  ربط بجواز السفر ({candidate.passportDocId || "جواز السفر"})
                </option>
              )}
              {candidate.photoUrl && (
                <option value={candidate.photoDocId || `DOC-${cleanCandidateId}-PHOTO`}>
                  ربط بالصورة الشخصية ({candidate.photoDocId || "الصورة"})
                </option>
              )}
              {candidate.contractUrl && (
                <option value={candidate.contractDocId || `DOC-${cleanCandidateId}-CONTRACT`}>
                  ربط بعقد العمل ({candidate.contractDocId || "عقد العمل"})
                </option>
              )}
              {candidate.medicalUrl && (
                <option value={candidate.medicalDocId || `DOC-${cleanCandidateId}-MEDICAL`}>
                  ربط بالتقرير الطبي ({candidate.medicalDocId || "التقرير الطبي"})
                </option>
              )}
              {candidate.cocImageUrl && (
                <option value={candidate.cocDocId || `DOC-${cleanCandidateId}-COC`}>
                  ربط بشهادة COC ({candidate.cocDocId || "COC"})
                </option>
              )}
              {candidate.visaUrl && (
                <option value={candidate.visaDocId || `DOC-${cleanCandidateId}-VISA`}>
                  ربط بالتأشيرة ({candidate.visaDocId || "التأشيرة"})
                </option>
              )}
              {additionalDocs.map(d => (
                <option key={d.id} value={d.id}>
                  ربط بـ: {d.title} ({d.id})
                </option>
              ))}
            </select>

            <button
              id="btn-add-quick-note"
              type="submit"
              disabled={!quickNoteText.trim()}
              className="px-4 py-2.5 bg-[#172a46] hover:bg-[#203a60] disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shrink-0 transition-colors shadow-2xs"
            >
              إضافة للملاحظات
            </button>
          </div>

          {/* Quick Preset Tags for common updates */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-stone-400 font-bold">عبارات شائعة:</span>
            {[
              "تم تسليم الجواز للقنصلية",
              "صدور نتيجة الفحص الطبي: لائق",
              "تم توثيق العقد عبر مساند",
              "بانتظار موافقة الكفيل المبدئية",
              "تم حجز موعد المقابلة"
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuickNoteText(preset)}
                className="px-2 py-0.5 bg-white hover:bg-stone-200 border border-stone-200 rounded-lg text-[10px] font-bold text-stone-600 transition-colors"
              >
                + {preset}
              </button>
            ))}
          </div>
        </form>

        {/* Main Editable Notes Area */}
        <div className="space-y-2">
          <label htmlFor="candidate-notes-textarea" className="block text-xs font-bold text-stone-600">
            النص الكامل للملاحظات والتفاصيل الخاصة بالمرشح:
          </label>
          <textarea
            id="candidate-notes-textarea"
            rows={6}
            value={candidate.notes || ""}
            onChange={e => {
              onUpdate(candidate.id, { notes: e.target.value });
              const timeStr = new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
              setNotesSavedTime(timeStr);
            }}
            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c] leading-relaxed"
            placeholder="اكتب هنا أي تفاصيل خاصة بالمرشح، تفضيلات الكفيل، أو أي متطلبات خاصة بالاستقدام..."
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-stone-400">
            عدد الأحرف: {(candidate.notes || "").length} | يحفظ التغييرات تلقائياً في السجل
          </span>
          <button
            id="btn-manual-save-notes"
            type="button"
            onClick={handleSaveNotes}
            className="px-4 py-2 bg-[#172a46] hover:bg-[#203a60] text-white rounded-xl text-xs font-black transition-colors self-end shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>تأكيد حفظ الملاحظات</span>
          </button>
        </div>
      </div>

      {/* Modal: Add Other Document */}
      {showAddOtherDocModal && (
        <div id="modal-add-other-doc" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-stone-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-sm text-[#172a46] flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-[#c9a84c]" />
                <span>أرشفة وثيقة أو مرفق إضافي</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddOtherDocModal(false);
                  setOtherDocTitle("");
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-bold mb-1">عنوان أو نوع الوثيقة *</label>
                <input
                  type="text"
                  required
                  value={otherDocTitle}
                  onChange={e => setOtherDocTitle(e.target.value)}
                  placeholder="مثال: شهادة خلو سوابق، تفويض مساند، مؤهل علمي"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#c9a84c]"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-bold mb-1">الملف (صورة أو PDF حتى 3MB) *</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={uploadingFolder === "documents"}
                  onChange={e => {
                    handleFileUpload("documents", e, otherDocTitle || "مرفق إضافي");
                    setShowAddOtherDocModal(false);
                    setOtherDocTitle("");
                  }}
                  className="w-full text-xs text-stone-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-[#172a46] hover:file:bg-stone-200 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowAddOtherDocModal(false);
                  setOtherDocTitle("");
                }}
                className="px-4 py-2 text-stone-500 font-bold rounded-xl hover:bg-stone-100 text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
