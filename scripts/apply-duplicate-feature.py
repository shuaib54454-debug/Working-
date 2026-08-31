from pathlib import Path

wizard = Path("src/components/AddCandidateWizard.tsx")
text = wizard.read_text(encoding="utf-8")
old_import = 'import { PassportScannerModal } from "./PassportScannerModal";\n'
new_import = old_import + 'import { findCandidateDuplicates } from "../lib/candidateDuplicate";\n'
if 'findCandidateDuplicates' not in text:
    text = text.replace(old_import, new_import, 1)

old = '''    onAdd(candidateData, initialPayment);\n    onClose();'''
new = '''    // Prevent duplicate registrations using locally cached candidates.\n    // Firestore synchronization keeps this cache populated across sessions.\n    try {\n      const stored = localStorage.getItem("shuayb_candidates");\n      const existing = stored ? JSON.parse(stored) : [];\n      const duplicateCheck = findCandidateDuplicates(\n        Array.isArray(existing) ? existing : [],\n        candidateData as Pick<Candidate, "firstName" | "lastName" | "dateOfBirth" | "passportNumber">\n      );\n\n      const confirmed = duplicateCheck.confirmed[0];\n      if (confirmed) {\n        alert(\n          `⚠️ هذا المرشح مسجل مسبقًا.\\n\\nالاسم: ${confirmed.candidate.firstName} ${confirmed.candidate.lastName}\\nرقم الجواز: ${confirmed.candidate.passportNumber || "غير مسجل"}\\nالرقم الداخلي: ${confirmed.candidate.id}\\n\\nلن يتم إنشاء سجل مكرر.`\n        );\n        return;\n      }\n\n      const possible = duplicateCheck.possible[0];\n      if (possible) {\n        const continueRegistration = window.confirm(\n          `⚠️ يوجد مرشح يحتمل أن يكون نفس الشخص.\\n\\nالاسم: ${possible.candidate.firstName} ${possible.candidate.lastName}\\nتاريخ الميلاد: ${possible.candidate.dateOfBirth || "غير مسجل"}\\nالرقم الداخلي: ${possible.candidate.id}\\n\\nهل تريد الاستمرار وتسجيله كمرشح جديد؟`\n        );\n        if (!continueRegistration) return;\n      }\n    } catch (duplicateError) {\n      console.warn("Candidate duplicate check failed; continuing registration:", duplicateError);\n    }\n\n    onAdd(candidateData, initialPayment);\n    onClose();'''
if old not in text:
    raise SystemExit("Could not find AddCandidateWizard finish block")
text = text.replace(old, new, 1)
wizard.write_text(text, encoding="utf-8")

app = Path("src/App.tsx")
text = app.read_text(encoding="utf-8")
old_import = '''  autoMigrateExistingDataToOwner\n} from "./lib/firebase";'''
new_import = '''  autoMigrateExistingDataToOwner\n} from "./lib/firebase";\nimport { findCandidateDuplicates } from "./lib/candidateDuplicate";'''
if 'from "./lib/candidateDuplicate"' not in text:
    if old_import not in text:
        raise SystemExit("Could not find App firebase import block")
    text = text.replace(old_import, new_import, 1)

old_sig = '''  const handleAddCandidate = (\n    data: Partial<Candidate>,\n    initialPayment?: { amount: number; method: any; note: string }\n  ) => {\n    const id = `CAND-${String(settings.nextId).padStart(4, "0")}`;'''
new_sig = '''  const handleAddCandidate = (\n    data: Partial<Candidate>,\n    initialPayment?: { amount: number; method: any; note: string }\n  ) => {\n    const duplicateCheck = findCandidateDuplicates(candidates, {\n      firstName: data.firstName || "",\n      lastName: data.lastName || "",\n      dateOfBirth: data.dateOfBirth || "",\n      passportNumber: data.passportNumber || ""\n    });\n\n    const confirmed = duplicateCheck.confirmed[0];\n    if (confirmed) {\n      alert(\n        `⚠️ هذا المرشح مسجل مسبقًا.\\n\\nالاسم: ${confirmed.candidate.firstName} ${confirmed.candidate.lastName}\\nرقم الجواز: ${confirmed.candidate.passportNumber || "غير مسجل"}\\nالرقم الداخلي: ${confirmed.candidate.id}\\n\\nلن يتم إنشاء سجل مكرر.`\n      );\n      setActiveCandidateId(confirmed.candidate.id);\n      setCurrentView("profile");\n      return;\n    }\n\n    const possible = duplicateCheck.possible[0];\n    if (possible) {\n      const continueRegistration = window.confirm(\n        `⚠️ يوجد مرشح يحتمل أن يكون نفس الشخص.\\n\\nالاسم: ${possible.candidate.firstName} ${possible.candidate.lastName}\\nتاريخ الميلاد: ${possible.candidate.dateOfBirth || "غير مسجل"}\\nالرقم الداخلي: ${possible.candidate.id}\\n\\nهل تريد الاستمرار وتسجيله كمرشح جديد؟`\n      );\n      if (!continueRegistration) {\n        setActiveCandidateId(possible.candidate.id);\n        setCurrentView("profile");\n        return;\n      }\n    }\n\n    const id = `CAND-${String(settings.nextId).padStart(4, "0")}`;'''
if old_sig not in text:
    raise SystemExit("Could not find App handleAddCandidate signature")
text = text.replace(old_sig, new_sig, 1)
app.write_text(text, encoding="utf-8")
