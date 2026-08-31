import React, { useState, useEffect, useMemo, useRef } from "react";
import { User } from "firebase/auth";
import {
  Candidate,
  GeneralExpense,
  AgencySettings,
  ActiveView,
  StageId,
  PaymentRecord
} from "./types";
import {
  STORAGE_KEYS,
  INITIAL_CANDIDATES,
  INITIAL_EXPENSES,
  DEFAULT_SETTINGS,
  getTodayDateString,
  calculateCandidateFinance
} from "./data/initialData";

import {
  TopBar,
  BottomBar,
  MobileQuickActionsSheet,
  MobileDrawer
} from "./components/Navigation";
import { Dashboard } from "./components/Dashboard";
import { CandidateList } from "./components/CandidateList";
import { CandidateProfile } from "./components/CandidateProfile";
import { AddCandidateWizard } from "./components/AddCandidateWizard";
import { EditCandidateModal } from "./components/EditCandidateModal";
import { FinanceView } from "./components/FinanceView";
import { ArchiveView } from "./components/ArchiveView";
import { SettingsView } from "./components/SettingsView";
import { ReceiptModal, ReceiptData } from "./components/ReceiptModal";
import { GoogleSheetsModal } from "./components/GoogleSheetsModal";
import { ExportModal } from "./components/ExportModal";
import { PassportScannerModal } from "./components/PassportScannerModal";
import { InstallAppModal } from "./components/InstallAppModal";
import { LoginScreen } from "./components/LoginScreen";
import {
  testFirebaseConnection,
  subscribeToAuth,
  subscribeToCandidates,
  syncCandidateToCloud,
  deleteCandidateFromCloud,
  syncAllCandidatesBatch,
  subscribeToExpenses,
  syncExpenseToCloud,
  deleteExpenseFromCloud,
  syncAllExpensesBatch,
  subscribeToSettings,
  syncSettingsToCloud,
  autoMigrateExistingDataToOwner
} from "./lib/firebase";
import { findCandidateDuplicates } from "./lib/candidateDuplicate";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function App() {
  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const migrationTriggeredRef = useRef(false);

  // 1. Persistent State
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.candidates);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load candidates from storage", e);
    }
    return INITIAL_CANDIDATES;
  });

  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpense[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.expenses);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to load expenses from storage", e);
    }
    return INITIAL_EXPENSES;
  });

  const [settings, setSettings] = useState<AgencySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.settings);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error("Failed to load settings from storage", e);
    }
    return DEFAULT_SETTINGS;
  });

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubAuth = subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthChecked(true);
    });
    return () => unsubAuth();
  }, []);

  // Real-time Cloud Sync with Firestore (scoped by currentUser.uid)
  useEffect(() => {
    if (!currentUser) return;

    testFirebaseConnection();

    // Auto-migrate legacy unassigned data once per session after login
    if (!migrationTriggeredRef.current) {
      migrationTriggeredRef.current = true;
      autoMigrateExistingDataToOwner(currentUser.uid, candidates, generalExpenses, settings).catch((err) =>
        console.error("Migration error:", err)
      );
    }

    const unsubCandidates = subscribeToCandidates(currentUser.uid, (cloudCandidates) => {
      if (cloudCandidates) {
        setCandidates(cloudCandidates);
      }
    });

    const unsubExpenses = subscribeToExpenses(currentUser.uid, (cloudExpenses) => {
      if (cloudExpenses) {
        setGeneralExpenses(cloudExpenses);
      }
    });

    const unsubSettings = subscribeToSettings(currentUser.uid, (cloudSettings) => {
      if (cloudSettings && cloudSettings.agencyName) {
        setSettings(cloudSettings);
      } else {
        syncSettingsToCloud(DEFAULT_SETTINGS, currentUser.uid);
      }
    });

    return () => {
      unsubCandidates();
      unsubExpenses();
      unsubSettings();
    };
  }, [currentUser]);

  // 2. Navigation & Active Selection State
  const [currentView, setCurrentView] = useState<ActiveView>("dashboard");
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);

  // 3. Modals State
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState<ReceiptData | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPassportScanner, setShowPassportScanner] = useState(false);
  const [showQuickHub, setShowQuickHub] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [exportDefaultTab, setExportDefaultTab] = useState<"CANDIDATES" | "FINANCE" | "PAYMENTS" | "EXPENSES">("CANDIDATES");

  // Auto-sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.candidates, JSON.stringify(candidates));
      localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(generalExpenses));
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch (e) {
      console.error("Error saving data to localStorage", e);
    }
  }, [candidates, generalExpenses, settings]);

  // Capacitor Native Lifecycle & Android Hardware Back Button Handler
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: "#172a46" }).catch(() => {});
      SplashScreen.hide().catch(() => {});

      const backListener = CapApp.addListener("backButton", () => {
        // 1. If any modal is open, close it
        if (showAddWizard) { setShowAddWizard(false); return; }
        if (showEditModal) { setShowEditModal(false); return; }
        if (showReceiptModal) { setShowReceiptModal(false); return; }
        if (showSheetsModal) { setShowSheetsModal(false); return; }
        if (showExportModal) { setShowExportModal(false); return; }
        if (showPassportScanner) { setShowPassportScanner(false); return; }
        if (showQuickHub) { setShowQuickHub(false); return; }
        if (showMobileDrawer) { setShowMobileDrawer(false); return; }
        if (showInstallModal) { setShowInstallModal(false); return; }

        // 2. If viewing a candidate profile, return to list
        if (currentView === "profile") {
          setActiveCandidateId(null);
          setCurrentView("list");
          return;
        }

        // 3. If in another subview, return to dashboard
        if (currentView !== "dashboard") {
          setCurrentView("dashboard");
          return;
        }

        // 4. If at top-level dashboard, minimize/exit
        CapApp.exitApp();
      });

      return () => {
        backListener.then(l => l.remove()).catch(() => {});
      };
    }
  }, [
    showAddWizard,
    showEditModal,
    showReceiptModal,
    showSheetsModal,
    showExportModal,
    showPassportScanner,
    showQuickHub,
    showMobileDrawer,
    showInstallModal,
    currentView
  ]);

  // Calculate alerts count
  const alertCount = useMemo(() => {
    let count = 0;
    const now = Date.now();
    candidates.filter(c => !c.archived).forEach(c => {
      if (c.passportExpiryDate) {
        const exp = new Date(c.passportExpiryDate).getTime();
        if (exp - now < 180 * 24 * 60 * 60 * 1000) count++;
      }
      const fin = calculateCandidateFinance(c);
      if (c.stage === "READY" && fin.outstanding > 0) count++;
    });
    return count;
  }, [candidates]);

  const selectedCandidate = useMemo(() => {
    if (!activeCandidateId) return null;
    return candidates.find(c => c.id === activeCandidateId) || null;
  }, [candidates, activeCandidateId]);

  // Actions
  const handleAddCandidate = (
    data: Partial<Candidate>,
    initialPayment?: { amount: number; method: any; note: string }
  ) => {
    const duplicateCheck = findCandidateDuplicates(candidates, {
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      dateOfBirth: data.dateOfBirth || "",
      passportNumber: data.passportNumber || ""
    });

    const confirmed = duplicateCheck.confirmed[0];
    if (confirmed) {
      alert(
        `⚠️ هذا المرشح مسجل مسبقًا.\n\nالاسم: ${confirmed.candidate.firstName} ${confirmed.candidate.lastName}\nرقم الجواز: ${confirmed.candidate.passportNumber || "غير مسجل"}\nالرقم الداخلي: ${confirmed.candidate.id}\n\nلن يتم إنشاء سجل مكرر.`
      );
      setActiveCandidateId(confirmed.candidate.id);
      setCurrentView("profile");
      return;
    }

    const possible = duplicateCheck.possible[0];
    if (possible) {
      const continueRegistration = window.confirm(
        `⚠️ يوجد مرشح يحتمل أن يكون نفس الشخص.\n\nالاسم: ${possible.candidate.firstName} ${possible.candidate.lastName}\nتاريخ الميلاد: ${possible.candidate.dateOfBirth || "غير مسجل"}\nالرقم الداخلي: ${possible.candidate.id}\n\nهل تريد الاستمرار وتسجيله كمرشح جديد؟`
      );
      if (!continueRegistration) {
        setActiveCandidateId(possible.candidate.id);
        setCurrentView("profile");
        return;
      }
    }

    const id = `CAND-${String(settings.nextId).padStart(4, "0")}`;
    const payments: PaymentRecord[] = [];

    if (initialPayment && initialPayment.amount > 0) {
      payments.push({
        id: Date.now(),
        amount: initialPayment.amount,
        date: getTodayDateString(),
        method: initialPayment.method,
        note: initialPayment.note || "دفعة مقدمة عند التسجيل",
        receiptNumber: `REC-${String(Math.floor(1000 + Math.random() * 9000))}`
      });
    }

    const uid = currentUser?.uid || "";
    const newCandidate: Candidate = {
      id,
      ownerUid: uid,
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      phone: data.phone || "",
      secondPhone: data.secondPhone || "",
      gender: data.gender || "female",
      dateOfBirth: data.dateOfBirth || "",
      address: data.address || "",
      job: data.job || "",
      country: data.country || "المملكة العربية السعودية",
      passportNumber: data.passportNumber || "",
      passportExpiryDate: data.passportExpiryDate || "",
      agentName: data.agentName || "",
      sponsorName: data.sponsorName || "",
      stage: data.stage || "NEW",
      totalFees: Number(data.totalFees || 0),
      payments,
      expenses: [],
      registrationDate: getTodayDateString(),
      archived: false,
      medicalStatus: "لم يفحص",
      trainingStatus: "لم يبدأ",
      visaStatus: "لم تقدم",
      flightStatus: "لم تحجز بعد"
    };

    setCandidates(prev => [newCandidate, ...prev]);
    if (uid) syncCandidateToCloud(newCandidate, uid);
    setSettings(prev => {
      const updated = { ...prev, nextId: prev.nextId + 1, ownerUid: uid };
      if (uid) syncSettingsToCloud(updated, uid);
      return updated;
    });

    // If initial payment was made, show receipt modal
    if (payments.length > 0) {
      setReceiptModalData({
        type: "PAYMENT",
        receiptNumber: payments[0].receiptNumber || "REC-001",
        candidateName: `${newCandidate.firstName} ${newCandidate.lastName}`,
        candidateId: newCandidate.id,
        candidateJob: newCandidate.job,
        amount: payments[0].amount,
        date: payments[0].date,
        paymentMethod: payments[0].method,
        note: payments[0].note,
        remainingBalance: Math.max(0, newCandidate.totalFees - payments[0].amount)
      });
      setShowReceiptModal(true);
    }

    setActiveCandidateId(id);
    setCurrentView("profile");
  };

  const handleUpdateCandidate = (id: string, updates: Partial<Candidate>) => {
    const uid = currentUser?.uid || "";
    setCandidates(prev => {
      const updatedList = prev.map(c => {
        if (c.id === id) {
          const updatedCand = { ...c, ...updates, ownerUid: uid };
          if (uid) syncCandidateToCloud(updatedCand, uid);
          return updatedCand;
        }
        return c;
      });
      return updatedList;
    });
  };

  const handleArchiveCandidate = (id: string) => {
    const uid = currentUser?.uid || "";
    setCandidates(prev => {
      const updatedList = prev.map(c => {
        if (c.id === id) {
          const archived = { ...c, archived: true, ownerUid: uid };
          if (uid) syncCandidateToCloud(archived, uid);
          return archived;
        }
        return c;
      });
      return updatedList;
    });
    setCurrentView("list");
  };

  const handleRestoreCandidate = (id: string) => {
    const uid = currentUser?.uid || "";
    setCandidates(prev => {
      const updatedList = prev.map(c => {
        if (c.id === id) {
          const restored = { ...c, archived: false, ownerUid: uid };
          if (uid) syncCandidateToCloud(restored, uid);
          return restored;
        }
        return c;
      });
      return updatedList;
    });
  };

  const handlePermanentDeleteCandidate = (id: string) => {
    setCandidates(prev => {
      const next = prev.filter(c => c.id !== id);
      try {
        localStorage.setItem(STORAGE_KEYS.candidates, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to persist candidates to localStorage:", e);
      }
      return next;
    });
    if (activeCandidateId === id) {
      setActiveCandidateId(null);
    }
    deleteCandidateFromCloud(id);
  };

  const handleBulkArchiveCandidates = (ids: string[]) => {
    const uid = currentUser?.uid || "";
    const idSet = new Set(ids);
    setCandidates(prev => {
      const updatedList = prev.map(c => {
        if (idSet.has(c.id)) {
          const archived = { ...c, archived: true, ownerUid: uid };
          if (uid) syncCandidateToCloud(archived, uid);
          return archived;
        }
        return c;
      });
      return updatedList;
    });
  };

  const handleBulkChangeStageCandidates = (ids: string[], newStage: StageId) => {
    const uid = currentUser?.uid || "";
    const idSet = new Set(ids);
    setCandidates(prev => {
      const updatedList = prev.map(c => {
        if (idSet.has(c.id)) {
          const updated = { ...c, stage: newStage, ownerUid: uid };
          if (uid) syncCandidateToCloud(updated, uid);
          return updated;
        }
        return c;
      });
      return updatedList;
    });
  };

  const handleBulkDeleteCandidates = (ids: string[]) => {
    const idSet = new Set(ids);
    setCandidates(prev => {
      const next = prev.filter(c => !idSet.has(c.id));
      try {
        localStorage.setItem(STORAGE_KEYS.candidates, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to persist candidates to localStorage:", e);
      }
      return next;
    });
    ids.forEach(id => deleteCandidateFromCloud(id));
  };

  const handleAddGeneralExpense = (expense: Omit<GeneralExpense, "id">) => {
    const uid = currentUser?.uid || "";
    const newExp: GeneralExpense = {
      ...expense,
      id: `EXP-${Date.now()}`,
      ownerUid: uid
    };
    setGeneralExpenses(prev => [newExp, ...prev]);
    if (uid) syncExpenseToCloud(newExp, uid);
  };

  const handleDeleteGeneralExpense = (id: string | number) => {
    const stringId = String(id);
    setGeneralExpenses(prev => prev.filter(e => String(e.id) !== stringId));
    deleteExpenseFromCloud(stringId);
  };

  const handleSaveSettings = (newSettings: AgencySettings) => {
    const uid = currentUser?.uid || "";
    const updated = { ...newSettings, ownerUid: uid };
    setSettings(updated);
    if (uid) syncSettingsToCloud(updated, uid);
  };

  const handleRestoreAllData = (data: {
    candidates: Candidate[];
    generalExpenses: GeneralExpense[];
    settings: AgencySettings;
  }) => {
    const uid = currentUser?.uid || "";
    const withUidCandidates = data.candidates.map(c => ({ ...c, ownerUid: uid }));
    const withUidExpenses = data.generalExpenses.map(e => ({ ...e, ownerUid: uid }));
    const withUidSettings = { ...data.settings, ownerUid: uid };

    setCandidates(withUidCandidates);
    setGeneralExpenses(withUidExpenses);
    setSettings(withUidSettings);
    if (uid) {
      syncAllCandidatesBatch(withUidCandidates, uid);
      syncAllExpensesBatch(withUidExpenses, uid);
      syncSettingsToCloud(withUidSettings, uid);
    }
  };

  const handleResetToDemo = () => {
    const uid = currentUser?.uid || "";
    const withUidCandidates = INITIAL_CANDIDATES.map(c => ({ ...c, ownerUid: uid }));
    const withUidExpenses = INITIAL_EXPENSES.map(e => ({ ...e, ownerUid: uid }));
    const withUidSettings = { ...DEFAULT_SETTINGS, ownerUid: uid };

    setCandidates(withUidCandidates);
    setGeneralExpenses(withUidExpenses);
    setSettings(withUidSettings);
    if (uid) {
      syncAllCandidatesBatch(withUidCandidates, uid);
      syncAllExpensesBatch(withUidExpenses, uid);
      syncSettingsToCloud(withUidSettings, uid);
    }
  };

  const handlePrintReceipt = (data: ReceiptData) => {
    setReceiptModalData(data);
    setShowReceiptModal(true);
  };

  // Google Sheets imported candidates handler
  const handleImportCandidatesFromSheets = (importedCandidates: Candidate[]) => {
    if (!importedCandidates || importedCandidates.length === 0) return;
    const uid = currentUser?.uid || "";

    // Merge or append candidates based on ID
    setCandidates(prev => {
      const existingIds = new Set(prev.map(c => c.id));
      const updated = [...prev];

      importedCandidates.forEach(incoming => {
        const withUid = { ...incoming, ownerUid: uid };
        if (existingIds.has(incoming.id)) {
          // Update existing candidate
          const index = updated.findIndex(c => c.id === incoming.id);
          if (index !== -1) {
            updated[index] = { ...updated[index], ...withUid };
          }
        } else {
          // Append new candidate
          updated.push(withUid);
        }
      });

      if (uid) syncAllCandidatesBatch(updated, uid);
      return updated;
    });
  };

  // If Auth check is in progress, show clean branded splash screen
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0f1d31] flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-[#172a46] border-2 border-[#c9a84c] flex items-center justify-center mb-4 shadow-xl animate-pulse">
          <ShieldCheck className="w-8 h-8 text-[#c9a84c]" />
        </div>
        <div className="flex items-center gap-2 text-stone-300 font-bold text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-[#c9a84c]" />
          <span>جاري التحقق من أمان الجلسة والمصادقة...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, render Login / Register Screen
  if (!currentUser) {
    return <LoginScreen onSuccess={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-[#fdfcfb] text-[#1a1c1e] flex flex-col font-sans selection:bg-[#c9a84c]/20 selection:text-[#172a46]">
      {/* Top Header Navigation */}
      <TopBar
        currentView={currentView}
        onNavigate={view => {
          setCurrentView(view);
          if (view !== "profile") setActiveCandidateId(null);
        }}
        onAddCandidate={() => setShowAddWizard(true)}
        onOpenGoogleSheetsModal={() => setShowSheetsModal(true)}
        onOpenPassportScanner={() => setShowPassportScanner(true)}
        onOpenExportModal={() => {
          setExportDefaultTab("CANDIDATES");
          setShowExportModal(true);
        }}
        onOpenInstallModal={() => setShowInstallModal(true)}
        settings={settings}
        candidateCount={candidates.filter(c => !c.archived).length}
        alertCount={alertCount}
        currentUserEmail={currentUser?.email}
        onToggleMobileMenu={() => setShowMobileDrawer(prev => !prev)}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === "dashboard" && (
          <Dashboard
            candidates={candidates}
            generalExpenses={generalExpenses}
            settings={settings}
            onNavigate={setCurrentView}
            onSelectCandidate={id => {
              setActiveCandidateId(id);
              setCurrentView("profile");
            }}
            onAddCandidate={() => setShowAddWizard(true)}
            onOpenGeneralExpenseModal={() => setCurrentView("finance")}
            onOpenExportModal={() => {
              setExportDefaultTab("FINANCE");
              setShowExportModal(true);
            }}
            onOpenPassportScanner={() => setShowPassportScanner(true)}
            onOpenGoogleSheetsModal={() => setShowSheetsModal(true)}
          />
        )}

        {currentView === "list" && (
          <CandidateList
            candidates={candidates}
            settings={settings}
            onSelectCandidate={id => {
              setActiveCandidateId(id);
              setCurrentView("profile");
            }}
            onAddCandidate={() => setShowAddWizard(true)}
            onEditCandidate={id => {
              setActiveCandidateId(id);
              setShowEditModal(true);
            }}
            onQuickStageChange={(id, newStage) => handleUpdateCandidate(id, { stage: newStage })}
            onOpenExportModal={() => {
              setExportDefaultTab("CANDIDATES");
              setShowExportModal(true);
            }}
            onBulkArchive={handleBulkArchiveCandidates}
            onBulkStageChange={handleBulkChangeStageCandidates}
            onBulkDelete={handleBulkDeleteCandidates}
          />
        )}

        {currentView === "profile" && selectedCandidate && (
          <CandidateProfile
            candidate={selectedCandidate}
            settings={settings}
            onBack={() => setCurrentView("list")}
            onUpdate={handleUpdateCandidate}
            onArchive={handleArchiveCandidate}
            onDelete={handlePermanentDeleteCandidate}
            onOpenEditModal={() => setShowEditModal(true)}
            onPrintReceipt={handlePrintReceipt}
          />
        )}

        {currentView === "finance" && (
          <FinanceView
            candidates={candidates}
            generalExpenses={generalExpenses}
            settings={settings}
            onAddGeneralExpense={handleAddGeneralExpense}
            onDeleteGeneralExpense={handleDeleteGeneralExpense}
            onOpenCandidateProfile={id => {
              setActiveCandidateId(id);
              setCurrentView("profile");
            }}
            onOpenExportModal={(tab) => {
              setExportDefaultTab(tab || "FINANCE");
              setShowExportModal(true);
            }}
          />
        )}

        {currentView === "archive" && (
          <ArchiveView
            candidates={candidates}
            settings={settings}
            onRestore={handleRestoreCandidate}
            onPermanentDelete={handlePermanentDeleteCandidate}
          />
        )}

        {currentView === "settings" && (
          <SettingsView
            settings={settings}
            candidates={candidates}
            generalExpenses={generalExpenses}
            onSaveSettings={handleSaveSettings}
            onRestoreAllData={handleRestoreAllData}
            onResetToDemo={handleResetToDemo}
            onOpenGoogleSheetsModal={() => setShowSheetsModal(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomBar
        currentView={currentView}
        onNavigate={view => {
          setCurrentView(view);
          if (view !== "profile") setActiveCandidateId(null);
        }}
        onAddCandidate={() => setShowAddWizard(true)}
        onOpenGoogleSheetsModal={() => setShowSheetsModal(true)}
        onOpenPassportScanner={() => setShowPassportScanner(true)}
        onOpenExportModal={() => {
          setExportDefaultTab("CANDIDATES");
          setShowExportModal(true);
        }}
        settings={settings}
        candidateCount={candidates.filter(c => !c.archived).length}
        alertCount={alertCount}
        currentUserEmail={currentUser?.email}
        onOpenQuickHub={() => setShowQuickHub(true)}
        onToggleMobileMenu={() => setShowMobileDrawer(true)}
      />

      {/* Mobile Quick Actions Bottom Sheet */}
      <MobileQuickActionsSheet
        isOpen={showQuickHub}
        onClose={() => setShowQuickHub(false)}
        onAddCandidate={() => setShowAddWizard(true)}
        onOpenPassportScanner={() => setShowPassportScanner(true)}
        onOpenGoogleSheetsModal={() => setShowSheetsModal(true)}
        onOpenExportModal={() => {
          setExportDefaultTab("CANDIDATES");
          setShowExportModal(true);
        }}
        onNavigate={view => {
          setCurrentView(view);
          if (view !== "profile") setActiveCandidateId(null);
        }}
      />

      {/* Full Mobile Drawer */}
      <MobileDrawer
        isOpen={showMobileDrawer}
        onClose={() => setShowMobileDrawer(false)}
        currentView={currentView}
        onNavigate={view => {
          setCurrentView(view);
          if (view !== "profile") setActiveCandidateId(null);
        }}
        settings={settings}
        candidateCount={candidates.filter(c => !c.archived).length}
        currentUserEmail={currentUser?.email}
        onOpenPassportScanner={() => setShowPassportScanner(true)}
        onOpenGoogleSheetsModal={() => setShowSheetsModal(true)}
        onOpenExportModal={() => {
          setExportDefaultTab("CANDIDATES");
          setShowExportModal(true);
        }}
        onOpenInstallModal={() => setShowInstallModal(true)}
      />

      {/* Modal: Google Sheets Center & Sync */}
      <GoogleSheetsModal
        isOpen={showSheetsModal}
        onClose={() => setShowSheetsModal(false)}
        candidates={candidates}
        generalExpenses={generalExpenses}
        settings={settings}
        onImportCandidates={handleImportCandidatesFromSheets}
      />

      {/* Modal: Add Candidate Wizard */}
      <AddCandidateWizard
        isOpen={showAddWizard}
        onClose={() => setShowAddWizard(false)}
        onAdd={handleAddCandidate}
        settings={settings}
      />

      {/* Modal: Edit Candidate */}
      {selectedCandidate && (
        <EditCandidateModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          candidate={selectedCandidate}
          onSave={handleUpdateCandidate}
        />
      )}

      {/* Modal: Printable Receipt / Voucher */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        receipt={receiptModalData}
        settings={settings}
      />

      {/* Modal: Export to CSV & PDF Official Reports */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        candidates={candidates}
        generalExpenses={generalExpenses}
        settings={settings}
        defaultTab={exportDefaultTab}
      />

      {/* Modal: Install Progressive Web App */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* Global Passport Scanner Modal */}
      <PassportScannerModal
        isOpen={showPassportScanner}
        onClose={() => setShowPassportScanner(false)}
        onApplyData={(data) => {
          // Open add wizard or create directly with scanned data
          handleAddCandidate({
            firstName: data.firstName,
            lastName: data.lastName !== "-" ? data.lastName : "",
            passportNumber: data.passportNumber,
            passportExpiryDate: data.passportExpiryDate,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            country: data.country,
            job: data.job || "عاملة منزلية"
          });
          setShowPassportScanner(false);
        }}
      />
    </div>
  );
}

