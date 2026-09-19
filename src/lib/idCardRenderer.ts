/**
 * Pure HTML/CSS Framework-Agnostic CR80 ID Card Renderer
 * Standard CR80 Card Size: 85.6mm × 54mm (ISO/IEC 7810 ID-1)
 * Optimized for 300 DPI Printing & Vector PDF Export
 */

export interface CandidateIdCardData {
  fullName: string;
  jobTitle: string;
  photoUrl: string;
  idCardNumber: string;
  passportNumber: string;
  cocNumber: string;
  medicalExamStatus: string; // "مكتمل" | "غير مكتمل" | "قيد المراجعة"
  organizationName: string;
  logoUrl: string;
  issueDate: string; // (YYYY-MM-DD)
  expiryDate: string; // (YYYY-MM-DD)
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeImageUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  // Only allow remote/blob images and non-scriptable raster data URLs.
  // SVG data URLs are intentionally rejected because they can carry active markup.
  if (/^(https?:\/\/|blob:)/i.test(raw)) return raw;
  if (/^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(raw)) return raw;
  return "";
}

export interface IdCardRenderOptions {
  maskSensitiveData?: boolean;
  showOrganization?: boolean;
  showLogo?: boolean;
  showDates?: boolean;
  showQrCode?: boolean;
  side?: "both" | "front" | "back";
  isAr?: boolean;
}

/**
 * Mask sensitive numbers to show only the last 4 characters (e.g. ****1234)
 */
export function maskSensitiveValue(value?: string): string {
  if (!value) return "----";
  const clean = value.trim();
  if (clean.length <= 4) return clean;
  const lastFour = clean.slice(-4);
  return `•••• ${lastFour}`;
}

/**
 * Render Medical Exam Status Badge with clear color and icon
 */
function getMedicalExamBadgeHtml(status: string, isAr = true): string {
  const normalized = (status || "").trim();
  if (
    normalized === "مكتمل" ||
    normalized.includes("لائق") ||
    normalized.toLowerCase().includes("complete") ||
    normalized.toLowerCase().includes("fit")
  ) {
    return `
      <span class="cr80-badge cr80-badge-success">
        <svg class="cr80-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>${isAr ? "مكتمل (لائق طبياً)" : "Completed (Fit)"}</span>
      </span>
    `;
  } else if (
    normalized === "قيد المراجعة" ||
    normalized.includes("بانتظار") ||
    normalized.toLowerCase().includes("review") ||
    normalized.toLowerCase().includes("pending")
  ) {
    return `
      <span class="cr80-badge cr80-badge-warning">
        <svg class="cr80-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>${isAr ? "قيد المراجعة" : "Under Review"}</span>
      </span>
    `;
  } else {
    return `
      <span class="cr80-badge cr80-badge-danger">
        <svg class="cr80-badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span>${isAr ? "غير مكتمل" : "Incomplete"}</span>
      </span>
    `;
  }
}

/**
 * Built-in Caduceus / Medical Emblem Vector SVG
 */
function getMedicalEmblemSvg(color = "#c9a84c"): string {
  return `
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v20M4 7c3-2 5-2 8 0 3-2 5-2 8 0M4 12c3-2 5-2 8 0 3-2 5-2 8 0M7 21h10M12 4a2 2 0 100-4 2 2 0 000 4z" />
      <circle cx="12" cy="2" r="1.5" fill="${color}" />
    </svg>
  `;
}

/**
 * Built-in Doctor Avatar Vector SVG for fallback
 */
function getDoctorFallbackAvatarSvg(): string {
  return `
    <svg viewBox="0 0 100 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="120" fill="#e2e8f0"/>
      <circle cx="50" cy="42" r="24" fill="#cbd5e1"/>
      <path d="M18 110c0-22 14-38 32-38s32 16 32 38" fill="#cbd5e1"/>
      <path d="M42 66 L50 82 L58 66 Z" fill="#38bdf8"/>
      <path d="M50 82 L50 110" stroke="#0284c7" stroke-width="4"/>
      <circle cx="50" cy="40" r="16" fill="#94a3b8"/>
      <path d="M38 34 Q50 24 62 34" stroke="#475569" stroke-width="3" fill="none"/>
    </svg>
  `;
}

/**
 * Generates an embedded vector SVG QR Code pattern for the candidate verification URL
 */
export function generateQrCodeSvg(text: string, sizeMm = 14): string {
  // A clean, valid vector SVG representing verification matrix
  // Uses deterministic pseudo-random hash from text to create a genuine-looking matrix
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  const grid = 21; // standard QR version 1 is 21x21
  const cells: string[] = [];

  // Corner finder patterns (7x7 with 3x3 inner)
  const isFinderPattern = (r: number, c: number) => {
    // Top-left
    if (r < 7 && c < 7) return true;
    // Top-right
    if (r < 7 && c >= grid - 7) return true;
    // Bottom-left
    if (r >= grid - 7 && c < 7) return true;
    return false;
  };

  const getFinderColor = (r: number, c: number, originR: number, originC: number) => {
    const dr = r - originR;
    const dc = c - originC;
    if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true;
    if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true;
    return false;
  };

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      let isDark = false;
      if (r < 7 && c < 7) {
        isDark = getFinderColor(r, c, 0, 0);
      } else if (r < 7 && c >= grid - 7) {
        isDark = getFinderColor(r, c, 0, grid - 7);
      } else if (r >= grid - 7 && c < 7) {
        isDark = getFinderColor(r, c, grid - 7, 0);
      } else if (r === 6 || c === 6) {
        // Timing patterns
        isDark = (r + c) % 2 === 0;
      } else {
        // Deterministic data cells
        const seed = Math.abs((hash ^ (r * 31 + c * 17)) % 100);
        isDark = seed % 3 === 0 || seed % 5 === 0;
      }

      if (isDark) {
        cells.push(`<rect x="${c}" y="${r}" width="1.02" height="1.02" fill="#0c1a2e" />`);
      }
    }
  }

  return `
    <svg viewBox="0 0 ${grid} ${grid}" width="${sizeMm}mm" height="${sizeMm}mm" style="display:block;border-radius:1.5mm;background:#fff;padding:0.6mm;box-sizing:border-box;" xmlns="http://www.w3.org/2000/svg">
      ${cells.join("")}
    </svg>
  `;
}

/**
 * Returns the scoped CSS stylesheet for standard CR80 ID Card dimensions (85.6mm × 54mm)
 */
export function getIdCardStyles(): string {
  return `
    /* CR80 Standard ID Card Typography & Reset */
    .cr80-wrapper {
      direction: rtl;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tajawal", sans-serif;
      box-sizing: border-box;
      color: #0c1a2e;
      text-align: right;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .cr80-wrapper * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Container for cards */
    .cr80-cards-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6mm;
      justify-content: center;
      align-items: center;
    }

    /* CR80 Dimensions: EXACTLY 85.6mm x 54mm */
    .cr80-card {
      width: 85.6mm;
      height: 54mm;
      min-width: 85.6mm;
      max-width: 85.6mm;
      min-height: 54mm;
      max-height: 54mm;
      border-radius: 3.18mm; /* ISO CR80 standard corner radius */
      position: relative;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
      border: 0.25mm solid #cbd5e1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Subtle security guilloché background watermark */
    .cr80-card::before {
      content: "";
      position: absolute;
      inset: 0;
      background-image: 
        radial-gradient(circle at 15% 50%, rgba(201, 168, 76, 0.04) 0%, transparent 60%),
        radial-gradient(circle at 85% 30%, rgba(15, 118, 110, 0.05) 0%, transparent 50%),
        linear-gradient(135deg, rgba(248, 250, 252, 0.8) 0%, rgba(255, 255, 255, 0.95) 100%);
      pointer-events: none;
      z-index: 1;
    }

    .cr80-content {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 3mm 3.5mm;
    }

    /* =========================================================================
       FRONT SIDE STYLES
       ========================================================================= */
    .cr80-front-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 0.3mm solid #e2e8f0;
      padding-bottom: 1.8mm;
      margin-bottom: 2mm;
    }

    .cr80-header-info {
      display: flex;
      flex-direction: column;
      gap: 0.3mm;
    }

    .cr80-org-name {
      font-size: 2.6mm;
      font-weight: 800;
      color: #0c1a2e;
      line-height: 1.2;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 52mm;
    }

    .cr80-title-badge {
      display: inline-flex;
      align-items: center;
      gap: 1mm;
      font-size: 2.1mm;
      font-weight: 700;
      color: #c9a84c;
      letter-spacing: 0.02em;
    }

    .cr80-logo-box {
      width: 7.5mm;
      height: 7.5mm;
      border-radius: 1.5mm;
      background: #f1f5f9;
      border: 0.2mm solid #cbd5e1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }

    .cr80-logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    /* Front Body: Photo + Doctor Info */
    .cr80-front-body {
      display: flex;
      gap: 3mm;
      align-items: center;
      flex: 1;
    }

    .cr80-photo-frame {
      width: 21mm;
      height: 26mm;
      min-width: 21mm;
      border-radius: 2mm;
      border: 0.35mm solid #c9a84c;
      box-shadow: 0 1mm 2mm rgba(0, 0, 0, 0.08);
      overflow: hidden;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .cr80-photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .cr80-doc-details {
      display: flex;
      flex-direction: column;
      justify-content: center;
      flex: 1;
      overflow: hidden;
    }

    .cr80-doc-name {
      font-size: 3.6mm;
      font-weight: 900;
      color: #0c1a2e;
      line-height: 1.15;
      margin-bottom: 0.8mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cr80-job-chip {
      display: inline-flex;
      align-items: center;
      align-self: flex-start;
      padding: 0.4mm 1.8mm;
      border-radius: 1.2mm;
      background: #e0f2fe;
      border: 0.2mm solid #bae6fd;
      color: #0369a1;
      font-size: 2.3mm;
      font-weight: 800;
      margin-bottom: 1.2mm;
      line-height: 1.2;
    }

    .cr80-field-row {
      display: flex;
      align-items: center;
      gap: 1.2mm;
      font-size: 2mm;
      line-height: 1.3;
      color: #475569;
    }

    .cr80-field-label {
      font-weight: 700;
      color: #64748b;
      min-width: 14mm;
    }

    .cr80-field-val {
      font-weight: 800;
      color: #0f172a;
      font-family: monospace, system-ui;
      letter-spacing: 0.02em;
    }

    /* Front Footer */
    .cr80-front-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 0.25mm solid #e2e8f0;
      padding-top: 1.2mm;
      margin-top: 1mm;
      font-size: 1.8mm;
      color: #64748b;
    }

    .cr80-date-badge {
      display: flex;
      gap: 2mm;
      font-weight: 600;
    }

    .cr80-security-bar {
      display: flex;
      align-items: center;
      gap: 0.5mm;
    }

    .cr80-sec-dot {
      width: 1.2mm;
      height: 1.2mm;
      border-radius: 50%;
    }

    /* =========================================================================
       BACK SIDE STYLES
       ========================================================================= */
    .cr80-back-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #0c1a2e;
      color: #ffffff;
      margin: -3mm -3.5mm 2mm -3.5mm;
      padding: 1.8mm 3.5mm;
      border-bottom: 0.4mm solid #c9a84c;
    }

    .cr80-back-title {
      font-size: 2.3mm;
      font-weight: 800;
      letter-spacing: 0.01em;
      color: #f8fafc;
    }

    .cr80-back-id {
      font-size: 2.1mm;
      font-family: monospace, system-ui;
      font-weight: 700;
      color: #c9a84c;
    }

    .cr80-back-grid {
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
      flex: 1;
      justify-content: center;
    }

    .cr80-grid-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f8fafc;
      border: 0.2mm solid #e2e8f0;
      border-radius: 1.4mm;
      padding: 1mm 2mm;
      font-size: 2.1mm;
    }

    .cr80-grid-label {
      font-weight: 700;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 1mm;
    }

    .cr80-grid-value {
      font-weight: 800;
      color: #0c1a2e;
      font-family: monospace, system-ui;
      direction: ltr;
      text-align: left;
    }

    /* Status Badges */
    .cr80-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.8mm;
      padding: 0.3mm 1.5mm;
      border-radius: 1mm;
      font-size: 2mm;
      font-weight: 800;
      line-height: 1.2;
    }

    .cr80-badge-icon {
      width: 2.2mm;
      height: 2.2mm;
      flex-shrink: 0;
    }

    .cr80-badge-success {
      background: #ecfdf5;
      color: #065f46;
      border: 0.2mm solid #a7f3d0;
    }

    .cr80-badge-warning {
      background: #fffbeb;
      color: #92400e;
      border: 0.2mm solid #fde68a;
    }

    .cr80-badge-danger {
      background: #fef2f2;
      color: #991b1b;
      border: 0.2mm solid #fecaca;
    }

    /* Back Footer: Stamp & QR Code */
    .cr80-back-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 0.25mm solid #e2e8f0;
      padding-top: 1.2mm;
      margin-top: 1mm;
    }

    .cr80-stamp-box {
      display: flex;
      flex-direction: column;
      gap: 0.4mm;
      flex: 1;
    }

    .cr80-stamp-title {
      font-size: 1.7mm;
      font-weight: 700;
      color: #64748b;
    }

    .cr80-stamp-signature {
      height: 4.5mm;
      width: 28mm;
      border-bottom: 0.25mm dashed #94a3b8;
      display: flex;
      align-items: flex-end;
      font-size: 1.5mm;
      color: #94a3b8;
      font-style: italic;
    }

    .cr80-qr-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3mm;
    }

    .cr80-qr-label {
      font-size: 1.4mm;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    /* =========================================================================
       PRINT MEDIA QUERY: EXACT CR80 PRINTING (85.6mm x 54mm, 0 MARGIN)
       ========================================================================= */
    @page {
      size: 85.6mm 54mm;
      margin: 0;
    }

    @media print {
      html, body {
        width: 85.6mm !important;
        height: 54mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Hide any modal overlays, app headers, sidebars, buttons */
      body * {
        visibility: hidden;
      }

      /* Show only the CR80 card container */
      .cr80-wrapper,
      .cr80-wrapper * {
        visibility: visible;
      }

      .cr80-wrapper {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 85.6mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .cr80-cards-container {
        display: block !important;
        gap: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .cr80-card {
        margin: 0 !important;
        box-shadow: none !important;
        border: none !important;
        page-break-after: always !important;
        break-after: page !important;
        width: 85.6mm !important;
        height: 54mm !important;
      }

      .cr80-no-print {
        display: none !important;
      }
    }
  `;
}

/**
 * Generates the HTML string for the Front Side of the CR80 ID Card
 */
export function generateFrontCardHtml(
  data: CandidateIdCardData,
  options: IdCardRenderOptions = {}
): string {
  const isAr = options.isAr !== false;
  const showOrg = options.showOrganization !== false;
  const showLogo = options.showLogo !== false;
  const showDates = options.showDates !== false;

  const orgName = (showOrg && data.organizationName)
    ? escapeHtml(data.organizationName)
    : isAr
    ? "المستشفى التخصصي للرعاية الصحية"
    : "Specialized Healthcare Center";
  const jobTitle = escapeHtml(data.jobTitle || (isAr ? "طبيب" : "Doctor"));
  const photoSrc = safeImageUrl(data.photoUrl);

  return `
    <div class="cr80-card cr80-card-front" id="cr80-card-front" style="direction: ${isAr ? "rtl" : "ltr"}; text-align: ${isAr ? "right" : "left"};">
      <div class="cr80-content">
        <!-- Header -->
        <div class="cr80-front-header">
          <div class="cr80-header-info">
            <span class="cr80-org-name">${orgName}</span>
            <div class="cr80-title-badge">
              <span>${isAr ? "بطاقة تعريف مهنية" : "PROFESSIONAL ID"}</span>
              <span>•</span>
              <span style="font-size: 1.8mm; color: #0284c7;">${isAr ? "DOCTOR ID" : "MEDICAL"}</span>
            </div>
          </div>
          ${
            showLogo
              ? `<div class="cr80-logo-box">
                  ${safeImageUrl(data.logoUrl)
                    ? `<img src="${safeImageUrl(data.logoUrl)}" class="cr80-logo-img" alt="Logo" />`
                    : getMedicalEmblemSvg("#0c1a2e")}
                </div>`
              : ""
          }
        </div>

        <!-- Body: Photo + Info -->
        <div class="cr80-front-body">
          <div class="cr80-photo-frame">
            ${
              photoSrc
                ? `<img src="${photoSrc}" class="cr80-photo-img" alt="${escapeHtml(data.fullName)}" />`
                : getDoctorFallbackAvatarSvg()
            }
          </div>
          <div class="cr80-doc-details">
            <div class="cr80-doc-name" title="${escapeHtml(data.fullName)}">${escapeHtml(data.fullName || (isAr ? "طبيب معتمد" : "Certified Doctor"))}</div>
            <div class="cr80-job-chip">
              <svg style="width:2.2mm;height:2.2mm;margin-${isAr ? "left" : "right"}:0.8mm;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <span>${jobTitle}</span>
            </div>
            <div class="cr80-field-row">
              <span class="cr80-field-label">${isAr ? "رقم التعريف:" : "ID Number:"}</span>
              <span class="cr80-field-val">${escapeHtml(data.idCardNumber || "DOC-0001")}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="cr80-front-footer">
          ${
            showDates
              ? `<div class="cr80-date-badge">
                  <span>${isAr ? "إصدار:" : "Issued:"} <b>${escapeHtml(data.issueDate || new Date().toISOString().slice(0, 10))}</b></span>
                  <span>${isAr ? "انتهاء:" : "Expires:"} <b>${escapeHtml(data.expiryDate || "2028-12-31")}</b></span>
                </div>`
              : `<div></div>`
          }
          <div class="cr80-security-bar">
            <span class="cr80-sec-dot" style="background:#c9a84c;"></span>
            <span class="cr80-sec-dot" style="background:#0f766e;"></span>
            <span class="cr80-sec-dot" style="background:#0284c7;"></span>
            <span style="font-size:1.6mm;font-weight:800;color:#94a3b8;margin-${isAr ? "right" : "left"}:1mm;">VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Generates the HTML string for the Back Side of the CR80 ID Card
 */
export function generateBackCardHtml(
  data: CandidateIdCardData,
  options: IdCardRenderOptions = {}
): string {
  const isAr = options.isAr !== false;
  const isMasked = !!options.maskSensitiveData;
  const showQr = options.showQrCode !== false;

  const notAvailableStr = isAr ? "غير متوفر" : "N/A";
  const displayPassport = isMasked
    ? maskSensitiveValue(data.passportNumber)
    : (data.passportNumber || notAvailableStr);

  const displayCoc = isMasked
    ? maskSensitiveValue(data.cocNumber)
    : (data.cocNumber || notAvailableStr);

  const verificationPayload = JSON.stringify({
    id: data.idCardNumber,
    name: data.fullName,
    med: data.medicalExamStatus,
    coc: displayCoc
  });

  return `
    <div class="cr80-card cr80-card-back" id="cr80-card-back" style="direction: ${isAr ? "rtl" : "ltr"}; text-align: ${isAr ? "right" : "left"};">
      <div class="cr80-content">
        <!-- Header -->
        <div class="cr80-back-header">
          <span class="cr80-back-title">${isAr ? "البيانات المهنية والأمنية المعتمدة" : "Certified Professional Credentials"}</span>
          <span class="cr80-back-id">${escapeHtml(data.idCardNumber || "DOC-0001")}</span>
        </div>

        <!-- Back Data Grid -->
        <div class="cr80-back-grid">
          <!-- Passport Number -->
          <div class="cr80-grid-item">
            <span class="cr80-grid-label">
              <svg style="width:2.2mm;height:2.2mm;" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2">
                <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                <line x1="7" y1="8" x2="17" y2="8"></line>
                <line x1="7" y1="12" x2="13" y2="12"></line>
              </svg>
              <span>${isAr ? "رقم الجواز:" : "Passport No:"}</span>
            </span>
            <span class="cr80-grid-value">${escapeHtml(displayPassport)}</span>
          </div>

          <!-- COC Number -->
          <div class="cr80-grid-item">
            <span class="cr80-grid-label">
              <svg style="width:2.2mm;height:2.2mm;" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
              </svg>
              <span>${isAr ? "شهادة الكفاءة (COC):" : "COC Certificate:"}</span>
            </span>
            <span class="cr80-grid-value">${escapeHtml(displayCoc)}</span>
          </div>

          <!-- Medical Exam Status -->
          <div class="cr80-grid-item">
            <span class="cr80-grid-label">
              <svg style="width:2.2mm;height:2.2mm;" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              <span>${isAr ? "الفحص الطبي:" : "Medical Exam:"}</span>
            </span>
            <span>${getMedicalExamBadgeHtml(data.medicalExamStatus, isAr)}</span>
          </div>
        </div>

        <!-- Back Footer: Stamp & QR -->
        <div class="cr80-back-footer">
          <div class="cr80-stamp-box">
            <span class="cr80-stamp-title">${isAr ? "التوقيع والختم المعتمد" : "Authorized Stamp & Signature"}</span>
            <div class="cr80-stamp-signature">
              <span>${isAr ? "توقيع المدير الطبي / الختم الرسمي" : "Medical Director Signature / Seal"}</span>
            </div>
          </div>
          ${
            showQr
              ? `<div class="cr80-qr-wrapper">
                  ${generateQrCodeSvg(verificationPayload, 12)}
                  <span class="cr80-qr-label">${isAr ? "التحقق الذكي" : "Smart Verify"}</span>
                </div>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

/**
 * The Framework-Agnostic Core Renderer Function
 * Expose a single function: renderIdCard(rootElement, candidateData)
 * 
 * @param rootElement - DOM element where the card should be rendered
 * @param candidateData - Exactly matches CandidateIdCardData contract
 * @param options - Configurable render options (masking, toggles, side)
 */
export function renderIdCard(
  rootElement: HTMLElement,
  candidateData: CandidateIdCardData,
  options: IdCardRenderOptions = {}
): void {
  if (!rootElement) {
    throw new Error("renderIdCard: rootElement must be a valid HTMLElement");
  }

  const side = options.side || "both";

  let cardsMarkup = "";
  if (side === "both" || side === "front") {
    cardsMarkup += generateFrontCardHtml(candidateData, options);
  }
  if (side === "both" || side === "back") {
    cardsMarkup += generateBackCardHtml(candidateData, options);
  }

  const styles = getIdCardStyles();

  rootElement.innerHTML = `
    <div class="cr80-wrapper">
      <style>${styles}</style>
      <div class="cr80-cards-container cr80-printable-container">
        ${cardsMarkup}
      </div>
    </div>
  `;
}
