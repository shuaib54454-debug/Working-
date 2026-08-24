import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvasPro from "html2canvas-pro";
import { toPng } from "html-to-image";
import { Candidate, GeneralExpense, AgencySettings } from "../types";
import { formatMoney, calculateCandidateFinance, STAGES } from "../data/initialData";

export interface PDFExportOptions {
  filename?: string;
  orientation?: "portrait" | "landscape";
  unit?: "mm" | "pt" | "px";
  format?: "a4" | "letter";
  margin?: number;
  scale?: number;
}

/**
 * Robust HTML element to PDF converter that cleanly handles remote fonts,
 * cross-origin stylesheets, and Arabic RTL rendering without CSSStyleSheet security crashes.
 */
export async function exportElementToPDF(
  elementIdOrElement: string | HTMLElement,
  options: PDFExportOptions = {}
): Promise<boolean> {
  try {
    let element: HTMLElement | null = null;
    if (typeof elementIdOrElement === "string") {
      element = document.getElementById(elementIdOrElement);
    } else {
      element = elementIdOrElement;
    }

    if (!element) {
      console.error("Element not found for PDF export:", elementIdOrElement);
      return false;
    }

    const {
      filename = `Shuayb-Report-${new Date().toISOString().split("T")[0]}.pdf`,
      orientation = "portrait",
      format = "a4",
      scale = 2
    } = options;

    let imgData = "";
    let naturalWidth = 0;
    let naturalHeight = 0;

    // First preference: html2canvas-pro with useCORS and allowTaint configured safely
    try {
      const canvas = await html2canvasPro(element, {
        scale: Math.min(scale, 2.5),
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth || 1024,
        ignoreElements: (node) => {
          // Ignore interactive buttons, print-hidden controls or overlays inside capture
          return node.classList?.contains("no-print") || node.getAttribute?.("data-html2canvas-ignore") === "true";
        }
      });
      imgData = canvas.toDataURL("image/png");
      naturalWidth = canvas.width;
      naturalHeight = canvas.height;
    } catch (h2cError) {
      console.warn("html2canvas-pro encountered an issue, attempting html-to-image fallback with font filtering:", h2cError);
      try {
        // Fallback: html-to-image with skipFonts and remote stylesheet filtering to avoid CSSStyleSheet.cssRules DOMException
        imgData = await toPng(element, {
          pixelRatio: scale,
          backgroundColor: "#ffffff",
          cacheBust: false,
          skipFonts: true, // Avoids "Cannot access rules" error on external Google Fonts stylesheets
          filter: (domNode: HTMLElement) => {
            if (domNode.classList && domNode.classList.contains("no-print")) {
              return false;
            }
            return true;
          }
        });

        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            naturalWidth = img.naturalWidth || img.width;
            naturalHeight = img.naturalHeight || img.height;
            resolve();
          };
          img.onerror = reject;
          img.src = imgData;
        });
      } catch (fallbackErr) {
        console.error("All canvas rendering strategies failed:", fallbackErr);
        throw fallbackErr;
      }
    }

    if (!imgData || !naturalWidth || !naturalHeight) {
      throw new Error("Unable to capture element image data");
    }

    // Standard A4 dimensions in mm
    const pdfWidth = orientation === "portrait" ? 210 : 297;
    const pdfHeight = orientation === "portrait" ? 297 : 210;

    const imgWidth = pdfWidth;
    const imgHeight = (naturalHeight * pdfWidth) / naturalWidth;

    const doc = new jsPDF({
      orientation: orientation,
      unit: "mm",
      format: format,
      compress: true
    });

    let heightLeft = imgHeight;
    let position = 0;

    // First Page
    doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pdfHeight;

    // Subsequent pages if document exceeds one A4 page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      doc.addPage();
      doc.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pdfHeight;
    }

    // Save generated PDF
    const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    doc.save(cleanFilename);
    return true;
  } catch (error) {
    console.error("Failed to generate PDF document snapshot, opening print dialog as fallback:", error);
    window.print();
    return false;
  }
}

/**
 * Direct Programmatic PDF Generator using jsPDF and jspdf-autotable
 */
export function generateDirectTablePDF(options: {
  title: string;
  subtitle?: string;
  agencyName: string;
  phone?: string;
  taxNumber?: string;
  licenseNumber?: string;
  headers: string[];
  rows: (string | number)[][];
  summaryRows?: (string | number)[][];
  filename: string;
  orientation?: "portrait" | "landscape";
  themeColor?: string;
}) {
  const {
    title,
    subtitle = "Shuayb Trade Bridge - وكالة شُعيب",
    agencyName,
    phone,
    taxNumber,
    licenseNumber,
    headers,
    rows,
    summaryRows,
    filename,
    orientation = "portrait"
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toISOString().split("T")[0];

  // Top Header Banner
  doc.setFillColor(23, 42, 70); // #172a46
  doc.rect(0, 0, pageWidth, 25, "F");

  // Title in Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(agencyName || "Shuayb Agency", 14, 11);

  doc.setFontSize(9);
  doc.setTextColor(201, 168, 76); // #c9a84c gold
  doc.text(title, 14, 18);

  // Subtitle / Date in Header
  doc.setFontSize(8);
  doc.setTextColor(220, 220, 220);
  doc.text(`Date: ${today}`, pageWidth - 14, 11, { align: "right" });
  if (phone) {
    doc.text(`Tel: ${phone}`, pageWidth - 14, 18, { align: "right" });
  }

  // Meta Info Sub-bar
  const startY = 32;
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  const metaParts: string[] = [];
  if (licenseNumber) metaParts.push(`License: ${licenseNumber}`);
  if (taxNumber) metaParts.push(`Tax ID: ${taxNumber}`);
  metaParts.push(`Generated: ${new Date().toLocaleTimeString()}`);
  doc.text(metaParts.join("  |  "), 14, startY);

  // AutoTable
  autoTable(doc, {
    startY: startY + 5,
    head: [headers],
    body: rows,
    foot: summaryRows,
    theme: "striped",
    headStyles: {
      fillColor: [23, 42, 70],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center"
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
      halign: "center"
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [23, 42, 70],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center"
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      // Footer page numbering
      const str = `Page ${doc.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        str,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
      doc.text(
        subtitle,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    }
  });

  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(cleanFilename);
  return true;
}

/**
 * Direct PDF Export for Candidate Single Profile / Contract Invoice
 */
export function exportSingleCandidateDirectPDF(candidate: Candidate, settings: AgencySettings) {
  const fin = calculateCandidateFinance(candidate);
  const stageLabel = STAGES.find(s => s.id === candidate.stage)?.label || candidate.stage;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toISOString().split("T")[0];

  // Header Banner
  doc.setFillColor(23, 42, 70);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(settings.agencyName || "Shuayb Agency", 14, 12);

  doc.setFontSize(9);
  doc.setTextColor(201, 168, 76);
  doc.text("Worker Profile & Financial Ledger", 14, 20);

  doc.setFontSize(8);
  doc.setTextColor(220, 220, 220);
  doc.text(`Date: ${today}`, pageWidth - 14, 12, { align: "right" });
  doc.text(`File ID: ${candidate.id}`, pageWidth - 14, 20, { align: "right" });

  // Candidate Basic Details Table
  autoTable(doc, {
    startY: 35,
    head: [["Information Field", "Worker Details"]],
    body: [
      ["Full Name", `${candidate.firstName} ${candidate.lastName}`],
      ["Job / Profession", candidate.job || "General Worker"],
      ["Destination Country", candidate.country || "Ethiopia / Gulf"],
      ["Current Processing Stage", stageLabel],
      ["Passport Number", candidate.passportNumber || "Pending"],
      ["Phone / Contact", candidate.phone || "-"],
      ["Sponsor / Employer", candidate.sponsorName || "-"],
      ["Agent / Representative", candidate.agentName || "-"],
      ["Registration Date", candidate.registrationDate || today]
    ],
    theme: "grid",
    headStyles: { fillColor: [139, 38, 42], textColor: [255, 255, 255], fontStyle: "bold" },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 }
  });

  // Financial Summary Table
  const lastY = (doc as any).lastAutoTable?.finalY || 100;

  autoTable(doc, {
    startY: lastY + 8,
    head: [["Financial Account", "Amount"]],
    body: [
      ["Total Contract Fees", formatMoney(fin.fees, settings.currency)],
      ["Total Paid / Collected", formatMoney(fin.paid, settings.currency)],
      ["Remaining Outstanding Balance", formatMoney(fin.outstanding, settings.currency)],
      ["Total Transaction Expenses", formatMoney(fin.exp, settings.currency)],
      ["Net Candidate Margin", formatMoney(fin.fees - fin.exp, settings.currency)]
    ],
    theme: "striped",
    headStyles: { fillColor: [23, 42, 70], textColor: [255, 255, 255], fontStyle: "bold" },
    bodyStyles: { fontSize: 8.5 },
    margin: { left: 14, right: 14 }
  });

  // Payment History
  const lastY2 = (doc as any).lastAutoTable?.finalY || 160;
  if ((candidate.payments || []).length > 0) {
    const paymentRows = candidate.payments.map((p, idx) => [
      p.receiptNumber || `#${idx + 1}`,
      p.date,
      formatMoney(p.amount, settings.currency),
      p.method || "Cash",
      p.note || "Fee installment"
    ]);

    autoTable(doc, {
      startY: lastY2 + 8,
      head: [["Receipt #", "Date", "Amount", "Method", "Notes"]],
      body: paymentRows,
      theme: "grid",
      headStyles: { fillColor: [72, 109, 50], textColor: [255, 255, 255] },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });
  }

  doc.save(`Worker-${candidate.id}-${candidate.firstName}-${today}.pdf`);
  return true;
}
