import { Candidate, GeneralExpense, AgencySettings, StageId } from "../types";
import { STAGES, calculateCandidateFinance } from "../data/initialData";

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  properties: {
    title: string;
  };
  sheets: Array<{
    properties: {
      sheetId: number;
      title: string;
      index: number;
    };
  }>;
}

export interface ImportedCandidatePreview {
  firstName: string;
  lastName: string;
  phone: string;
  job: string;
  country: string;
  passportNumber?: string;
  totalFees: number;
  stage: StageId;
  agentName?: string;
  sponsorName?: string;
  notes?: string;
}

/**
 * List Google Spreadsheets accessible in the user's Google Drive.
 */
export async function listUserSpreadsheets(accessToken: string): Promise<GoogleDriveFile[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent("files(id, name, modifiedTime, webViewLink)");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=30`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `فشل جلب ملفات Google Sheets (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Get metadata about a specific Google Spreadsheet.
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string): Promise<SpreadsheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `فشل قراءة تفاصيل جدول البيانات (${response.status})`);
  }

  return response.json();
}

/**
 * Create a new comprehensive Google Spreadsheet with styled tabs and populate with current agency data.
 */
export async function createAgencySpreadsheet(
  accessToken: string,
  title: string,
  candidates: Candidate[],
  expenses: GeneralExpense[],
  settings: AgencySettings
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create spreadsheet with 3 tabs
  const createPayload = {
    properties: {
      title: title || `${settings.agencyName} - سجل المرشحين والمالية (${new Date().toLocaleDateString('ar-EG')})`,
      locale: "ar",
      autoRecalc: "ON_CHANGE"
    },
    sheets: [
      { properties: { title: "المرشحين", gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: "المدفوعات والسندات", gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: "المصروفات العامة", gridProperties: { frozenRowCount: 1 } } },
      { properties: { title: "ملخص الوكالة", gridProperties: { frozenRowCount: 1 } } }
    ]
  };

  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(createPayload)
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `فشل إنشاء جدول البيانات في Google Drive (${createRes.status})`);
  }

  const createdSheet = await createRes.json();
  const spreadsheetId = createdSheet.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate data into the newly created spreadsheet
  await exportDataToSpreadsheet(accessToken, spreadsheetId, candidates, expenses, settings);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Export / overwrite candidates, payments, expenses, and summary into a Google Spreadsheet.
 */
export async function exportDataToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  candidates: Candidate[],
  expenses: GeneralExpense[],
  settings: AgencySettings
): Promise<void> {
  // 1. Candidates Tab Data
  const candidateHeader = [
    "الرقم المرجعي",
    "الاسم الأول",
    "اسم العائلة",
    "الاسم الكامل",
    "رقم الهاتف",
    "الهاتف البديل",
    "الجنس",
    "المهنة المطلوبة",
    "دولة الاستقدام",
    "رقم الجواز",
    "تاريخ انتهاء الجواز",
    "المرحلة الحالية",
    "الفحص الطبي",
    "التدريب",
    "التأشيرة",
    "حجز الطيران",
    "إجمالي الرسوم المستحقة",
    "المبلغ المدفوع",
    "المتبقي بذمته",
    "المصروفات المباشرة",
    "صافي الربح",
    "اسم المندوب / الوسيط",
    "اسم الكفيل / صاحب العمل",
    "تاريخ التسجيل",
    "مؤرشف؟",
    "ملاحظات"
  ];

  const candidateRows = candidates.map(c => {
    const fin = calculateCandidateFinance(c);
    const stageName = STAGES.find(s => s.id === c.stage)?.label || c.stage;
    return [
      c.id,
      c.firstName,
      c.lastName,
      `${c.firstName} ${c.lastName}`.trim(),
      c.phone,
      c.secondPhone || "",
      c.gender === "male" ? "ذكر" : "أنثى",
      c.job,
      c.country,
      c.passportNumber || "",
      c.passportExpiryDate || "",
      stageName,
      c.medicalStatus || "لم يفحص",
      c.trainingStatus || "لم يبدأ",
      c.visaStatus || "لم تقدم",
      c.flightStatus || "لم تحجز",
      c.totalFees,
      fin.paid,
      fin.outstanding,
      fin.exp,
      fin.profit,
      c.agentName || "",
      c.sponsorName || "",
      c.registrationDate,
      c.archived ? "نعم (مؤرشف)" : "نشط",
      c.notes || ""
    ];
  });

  // 2. Payments & Receipts Tab Data
  const paymentHeader = [
    "رقم السند",
    "كود المرشح",
    "اسم المرشح",
    "التاريخ",
    "المبلغ",
    "طريقة الدفع",
    "البيان / الملاحظة"
  ];

  const paymentRows: any[][] = [];
  candidates.forEach(c => {
    (c.payments || []).forEach(p => {
      paymentRows.push([
        p.receiptNumber || `REC-${p.id}`,
        c.id,
        `${c.firstName} ${c.lastName}`.trim(),
        p.date,
        p.amount,
        p.method || "كاش",
        p.note || "دفعة أتعاب توظيف"
      ]);
    });
  });

  // 3. General Expenses Tab Data
  const expenseHeader = [
    "معرف المصروف",
    "عنوان المصروف",
    "التصنيف",
    "التاريخ",
    "المبلغ",
    "الملاحظات"
  ];

  const expenseRows = expenses.map(e => [
    e.id,
    e.title,
    e.category,
    e.date,
    e.amount,
    e.note || ""
  ]);

  // 4. Agency Overview Summary Data
  const totalFees = candidates.reduce((s, c) => s + (c.totalFees || 0), 0);
  const totalCollected = candidates.reduce((s, c) => s + calculateCandidateFinance(c).paid, 0);
  const totalCandidateExp = candidates.reduce((s, c) => s + calculateCandidateFinance(c).exp, 0);
  const totalGeneralExp = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExp = totalCandidateExp + totalGeneralExp;
  const netProfit = totalCollected - totalExp;

  const summaryData = [
    ["مؤشر الوكالة", "القيمة", "العملة"],
    ["اسم الوكالة", settings.agencyName, ""],
    ["إجمالي عدد المرشحين المسجلين", candidates.length, "مرشح"],
    ["المرشحون النشطون", candidates.filter(c => !c.archived).length, "مرشح"],
    ["المرشحون المكتملون / المسافرون", candidates.filter(c => c.stage === "TRAVELLED" || c.stage === "COMPLETED").length, "مرشح"],
    ["إجمالي رسوم العقود", totalFees, settings.currency],
    ["إجمالي المقبوضات الفعلية (الخزينة)", totalCollected, settings.currency],
    ["إجمالي المصروفات التشغيلية والتجهيز", totalExp, settings.currency],
    ["صافي الأرباح المحققة", netProfit, settings.currency],
    ["المبالغ المتبقية بذمة المرشحين", totalFees - totalCollected, settings.currency],
    ["تاريخ آخر مزامنة", new Date().toLocaleString('ar-EG'), ""]
  ];

  // Batch Update Values via Google Sheets API
  const valueData = [
    {
      range: "المرشحين!A1:Z",
      values: [candidateHeader, ...candidateRows]
    },
    {
      range: "المدفوعات والسندات!A1:G",
      values: [paymentHeader, ...paymentRows]
    },
    {
      range: "المصروفات العامة!A1:F",
      values: [expenseHeader, ...expenseRows]
    },
    {
      range: "ملخص الوكالة!A1:C",
      values: summaryData
    }
  ];

  // First clear old contents if sheets exist
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ranges: ["المرشحين!A1:Z", "المدفوعات والسندات!A1:G", "المصروفات العامة!A1:F", "ملخص الوكالة!A1:C"]
      })
    });
  } catch (e) {
    // If tabs differ, standard update will fill or create range
  }

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: valueData
      })
    }
  );

  if (!updateRes.ok) {
    // If sheet names didn't match (e.g. user selected an existing custom sheet), write to Sheet1 or first sheet
    const metadata = await getSpreadsheetDetails(accessToken, spreadsheetId);
    const firstSheetTitle = metadata.sheets?.[0]?.properties?.title || "Sheet1";
    
    const fallbackRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(firstSheetTitle)}!A1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          range: `${firstSheetTitle}!A1`,
          values: [candidateHeader, ...candidateRows]
        })
      }
    );

    if (!fallbackRes.ok) {
      const err = await fallbackRes.json().catch(() => ({}));
      throw new Error(err?.error?.message || `فشل تصدير البيانات إلى جدول Google Sheets (${fallbackRes.status})`);
    }
  }
}

/**
 * Import candidates from a selected Google Spreadsheet.
 */
export async function importCandidatesFromSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<ImportedCandidatePreview[]> {
  // 1. Fetch metadata to find sheet tabs
  const metadata = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const targetSheet = metadata.sheets?.find(s => s.properties.title === "المرشحين") || metadata.sheets?.[0];

  if (!targetSheet) {
    throw new Error("لم يتم العثور على أي صفحة بيانات داخل جدول Google Sheets المحدد.");
  }

  const sheetTitle = targetSheet.properties.title;
  const range = `${encodeURIComponent(sheetTitle)}!A1:Z500`;

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `فشل قراءة بيانات المرشحين من الجدول (${response.status})`);
  }

  const data = await response.json();
  const rows: string[][] = data.values || [];

  if (rows.length <= 1) {
    return [];
  }

  const headers = rows[0].map(h => String(h).trim().toLowerCase());
  
  // Find column indices
  const findCol = (keys: string[]) => {
    return headers.findIndex(h => keys.some(k => h.includes(k.toLowerCase())));
  };

  const fnCol = findCol(["الاسم الأول", "first name", "firstname", "first"]);
  const lnCol = findCol(["اسم العائلة", "اسم الاب", "last name", "lastname", "last"]);
  const fullNameCol = findCol(["الاسم الكامل", "الاسم", "name", "full name"]);
  const phoneCol = findCol(["الهاتف", "رقم الهاتف", "الجوال", "phone", "mobile"]);
  const jobCol = findCol(["المهنة", "الوظيفة", "job", "profession", "position"]);
  const countryCol = findCol(["الدولة", "دولة الاستقدام", "country", "destination"]);
  const passportCol = findCol(["الجواز", "رقم الجواز", "passport"]);
  const feesCol = findCol(["الرسوم", "المبلغ", "التكلفة", "fees", "total"]);
  const stageCol = findCol(["المرحلة", "الحالة", "stage", "status"]);
  const agentCol = findCol(["الوسيط", "المندوب", "agent"]);
  const sponsorCol = findCol(["الكفيل", "صاحب العمل", "sponsor"]);
  const notesCol = findCol(["ملاحظات", "notes"]);

  const importedList: ImportedCandidatePreview[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row.some(cell => cell && String(cell).trim() !== "")) {
      continue;
    }

    let firstName = "";
    let lastName = "";

    if (fnCol !== -1 && row[fnCol]) {
      firstName = String(row[fnCol]).trim();
      lastName = lnCol !== -1 && row[lnCol] ? String(row[lnCol]).trim() : "";
    } else if (fullNameCol !== -1 && row[fullNameCol]) {
      const parts = String(row[fullNameCol]).trim().split(" ");
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ") || "";
    } else {
      firstName = `مرشح ${i}`;
      lastName = "";
    }

    const phone = phoneCol !== -1 && row[phoneCol] ? String(row[phoneCol]).trim() : "";
    const job = jobCol !== -1 && row[jobCol] ? String(row[jobCol]).trim() : "عاملة منزلية";
    const country = countryCol !== -1 && row[countryCol] ? String(row[countryCol]).trim() : "المملكة العربية السعودية";
    const passportNumber = passportCol !== -1 && row[passportCol] ? String(row[passportCol]).trim() : "";
    const rawFees = feesCol !== -1 && row[feesCol] ? Number(String(row[feesCol]).replace(/[^0-9.-]+/g, "")) : 0;
    const totalFees = isNaN(rawFees) ? 0 : rawFees;

    // Stage parsing
    let stage: StageId = "NEW";
    if (stageCol !== -1 && row[stageCol]) {
      const rawStage = String(row[stageCol]).trim();
      if (rawStage.includes("فحص") || rawStage.includes("طبي")) stage = "MEDICAL";
      else if (rawStage.includes("تدريب")) stage = "TRAINING";
      else if (rawStage.includes("عقد") || rawStage.includes("توثيق")) stage = "CONTRACT";
      else if (rawStage.includes("تأشيرة") || rawStage.includes("فيزا")) stage = "VISA";
      else if (rawStage.includes("طيران") || rawStage.includes("تذكرة")) stage = "FLIGHT";
      else if (rawStage.includes("جاهز")) stage = "READY";
      else if (rawStage.includes("سافر") || rawStage.includes("مسافر")) stage = "TRAVELLED";
      else if (rawStage.includes("مكتمل")) stage = "COMPLETED";
      else if (rawStage.includes("ملغي")) stage = "CANCELLED";
    }

    const agentName = agentCol !== -1 && row[agentCol] ? String(row[agentCol]).trim() : undefined;
    const sponsorName = sponsorCol !== -1 && row[sponsorCol] ? String(row[sponsorCol]).trim() : undefined;
    const notes = notesCol !== -1 && row[notesCol] ? String(row[notesCol]).trim() : undefined;

    importedList.push({
      firstName,
      lastName,
      phone,
      job,
      country,
      passportNumber,
      totalFees,
      stage,
      agentName,
      sponsorName,
      notes
    });
  }

  return importedList;
}
