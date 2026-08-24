import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  writeBatch,
  query,
  where,
  getDocs,
  Unsubscribe
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword as firebaseUpdatePassword,
  User,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";
import { Candidate, GeneralExpense, AgencySettings } from "../types";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
// Set persistent session
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Auth persistence error:", err);
});

export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const storage = getStorage(app);

// Authentication Helpers
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return cred.user;
}

export async function registerOwnerAccount(email: string, pass: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetUserPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function changeCurrentUserPassword(newPassword: string): Promise<void> {
  if (!auth.currentUser) throw new Error("No authenticated user");
  await firebaseUpdatePassword(auth.currentUser, newPassword);
}

export function subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

// Test connection on boot
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    if (!auth.currentUser) return true;
    await getDocFromServer(doc(db, "_system", "connection_check"));
    console.log("Firebase Firestore connected successfully");
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("Firebase client is currently offline");
    } else {
      console.log("Firebase Firestore initialized:", error?.message || "ready");
    }
    return false;
  }
}

// Candidates Cloud Sync (Owner isolated)
export function subscribeToCandidates(
  ownerUid: string,
  onUpdate: (candidates: Candidate[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, "candidates");
  // Query only records belonging to the authenticated owner
  const q = query(colRef, where("ownerUid", "==", ownerUid));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Candidate[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Candidate);
      });
      onUpdate(list);
    },
    (error) => {
      console.warn("Firestore candidates sync listener error:", error.message);
      if (onError) onError(error);
    }
  );
}

export async function syncCandidateToCloud(candidate: Candidate, ownerUid?: string): Promise<void> {
  try {
    const uid = ownerUid || auth.currentUser?.uid;
    if (!uid) {
      console.warn("Skipping candidate sync: User not authenticated");
      return;
    }
    const docRef = doc(db, "candidates", candidate.id);
    const payload: Candidate = {
      ...candidate,
      ownerUid: candidate.ownerUid || uid
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (e) {
    console.error(`Failed to sync candidate ${candidate.id} to cloud:`, e);
  }
}

export async function deleteCandidateFromCloud(candidateId: string): Promise<void> {
  try {
    if (!auth.currentUser) return;
    const docRef = doc(db, "candidates", candidateId);
    await deleteDoc(docRef);
  } catch (e) {
    console.error(`Failed to delete candidate ${candidateId} from cloud:`, e);
  }
}

export async function syncAllCandidatesBatch(candidates: Candidate[], ownerUid?: string): Promise<void> {
  try {
    const uid = ownerUid || auth.currentUser?.uid;
    if (!uid) return;
    const batch = writeBatch(db);
    candidates.forEach((cand) => {
      const docRef = doc(db, "candidates", cand.id);
      batch.set(docRef, { ...cand, ownerUid: cand.ownerUid || uid }, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.error("Failed to batch save candidates:", e);
  }
}

// Expenses Cloud Sync (Owner isolated)
export function subscribeToExpenses(
  ownerUid: string,
  onUpdate: (expenses: GeneralExpense[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, "expenses");
  const q = query(colRef, where("ownerUid", "==", ownerUid));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const list: GeneralExpense[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as GeneralExpense);
      });
      onUpdate(list);
    },
    (error) => {
      console.warn("Firestore expenses sync listener error:", error.message);
      if (onError) onError(error);
    }
  );
}

export async function syncExpenseToCloud(expense: GeneralExpense, ownerUid?: string): Promise<void> {
  try {
    const uid = ownerUid || auth.currentUser?.uid;
    if (!uid) return;
    const docRef = doc(db, "expenses", String(expense.id));
    const payload: GeneralExpense = {
      ...expense,
      ownerUid: expense.ownerUid || uid
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (e) {
    console.error(`Failed to sync expense ${expense.id} to cloud:`, e);
  }
}

export async function deleteExpenseFromCloud(expenseId: string | number): Promise<void> {
  try {
    if (!auth.currentUser) return;
    const docRef = doc(db, "expenses", String(expenseId));
    await deleteDoc(docRef);
  } catch (e) {
    console.error(`Failed to delete expense ${expenseId} from cloud:`, e);
  }
}

export async function syncAllExpensesBatch(expenses: GeneralExpense[], ownerUid?: string): Promise<void> {
  try {
    const uid = ownerUid || auth.currentUser?.uid;
    if (!uid) return;
    const batch = writeBatch(db);
    expenses.forEach((exp) => {
      const docRef = doc(db, "expenses", String(exp.id));
      batch.set(docRef, { ...exp, ownerUid: exp.ownerUid || uid }, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    console.error("Failed to batch save expenses:", e);
  }
}

// Settings Cloud Sync (Isolated per user UID)
export function subscribeToSettings(
  ownerUid: string,
  onUpdate: (settings: AgencySettings) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, "settings", ownerUid);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AgencySettings;
        if (data.ownerUid === ownerUid || !data.ownerUid) {
          onUpdate(data);
        }
      }
    },
    (error) => {
      console.warn("Firestore settings sync listener error:", error.message);
      if (onError) onError(error);
    }
  );
}

export async function syncSettingsToCloud(settings: AgencySettings, ownerUid?: string): Promise<void> {
  try {
    const uid = ownerUid || auth.currentUser?.uid;
    if (!uid) return;
    const docRef = doc(db, "settings", uid);
    await setDoc(docRef, { ...settings, ownerUid: uid }, { merge: true });
  } catch (e) {
    console.error("Failed to sync settings to cloud:", e);
  }
}

// Cloud Storage Worker Document Upload Helper
export type WorkerStorageFolder = "passport" | "photo" | "contract" | "visa" | "medical" | "coc" | "documents";

export async function uploadWorkerDocument(
  candidateId: string,
  folder: WorkerStorageFolder,
  fileOrBlob: File | Blob,
  customFileName?: string
): Promise<{ downloadUrl: string; storagePath: string }> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Authentication required to upload documents");

  const cleanCandidateId = (candidateId || "NEW").replace(/[^a-zA-Z0-9_-]/g, "_");
  const ext = fileOrBlob.type.includes("pdf") ? "pdf" : "jpg";
  const fileName = customFileName || `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
  const path = `workers/${cleanCandidateId}/${folder}/${fileName}`;
  
  const fileRef = storageRef(storage, path);
  const snapshot = await uploadBytes(fileRef, fileOrBlob, {
    contentType: fileOrBlob.type || (ext === "pdf" ? "application/pdf" : "image/jpeg"),
    customMetadata: {
      ownerUid: uid,
      candidateId: cleanCandidateId,
      uploadedAt: new Date().toISOString()
    }
  });

  const downloadUrl = await getDownloadURL(snapshot.ref);
  return { downloadUrl, storagePath: path };
}

// Auto Data Migration Helper for Initial Owner Login
export async function autoMigrateExistingDataToOwner(
  ownerUid: string,
  currentCandidates: Candidate[],
  currentExpenses: GeneralExpense[],
  currentSettings: AgencySettings
): Promise<{ candidatesMigrated: number; expensesMigrated: number; settingsMigrated: boolean }> {
  let candidatesMigrated = 0;
  let expensesMigrated = 0;
  let settingsMigrated = false;

  try {
    // 1. Migrate candidates
    const candToMigrate = currentCandidates.map((c) => ({
      ...c,
      ownerUid: c.ownerUid || ownerUid
    }));
    if (candToMigrate.length > 0) {
      await syncAllCandidatesBatch(candToMigrate, ownerUid);
      candidatesMigrated = candToMigrate.length;
    }

    // 2. Migrate expenses
    const expToMigrate = currentExpenses.map((e) => ({
      ...e,
      ownerUid: e.ownerUid || ownerUid
    }));
    if (expToMigrate.length > 0) {
      await syncAllExpensesBatch(expToMigrate, ownerUid);
      expensesMigrated = expToMigrate.length;
    }

    // 3. Migrate settings
    await syncSettingsToCloud({ ...currentSettings, ownerUid }, ownerUid);
    settingsMigrated = true;

    console.log(`Migration completed for owner ${ownerUid}: ${candidatesMigrated} candidates, ${expensesMigrated} expenses.`);
  } catch (err) {
    console.error("Data migration error:", err);
  }

  return { candidatesMigrated, expensesMigrated, settingsMigrated };
}

