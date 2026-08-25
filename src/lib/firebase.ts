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

// Error handling conforming to Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

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
  // Query records for the authenticated owner
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
      handleFirestoreError(error, OperationType.LIST, "candidates");
      if (onError) onError(error);
    }
  );
}

export async function syncCandidateToCloud(candidate: Candidate, ownerUid?: string): Promise<void> {
  const uid = ownerUid || auth.currentUser?.uid;
  if (!uid) {
    console.warn("Skipping candidate sync: User not authenticated");
    return;
  }
  const path = `candidates/${candidate.id}`;
  try {
    const docRef = doc(db, "candidates", candidate.id);
    const payload: Candidate = {
      ...candidate,
      ownerUid: uid
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function deleteCandidateFromCloud(candidateId: string): Promise<void> {
  const path = `candidates/${candidateId}`;
  try {
    if (!auth.currentUser) return;
    const docRef = doc(db, "candidates", candidateId);
    await deleteDoc(docRef);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

export async function syncAllCandidatesBatch(candidates: Candidate[], ownerUid?: string): Promise<void> {
  try {
    const uid = ownerUid || auth.currentUser?.uid;
    if (!uid || candidates.length === 0) return;
    const batch = writeBatch(db);
    candidates.forEach((cand) => {
      const docRef = doc(db, "candidates", cand.id);
      batch.set(docRef, { ...cand, ownerUid: uid }, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, "candidates/batch");
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
      handleFirestoreError(error, OperationType.LIST, "expenses");
      if (onError) onError(error);
    }
  );
}

export async function syncExpenseToCloud(expense: GeneralExpense, ownerUid?: string): Promise<void> {
  const uid = ownerUid || auth.currentUser?.uid;
  if (!uid) return;
  const path = `expenses/${expense.id}`;
  try {
    const docRef = doc(db, "expenses", String(expense.id));
    const payload: GeneralExpense = {
      ...expense,
      ownerUid: uid
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function deleteExpenseFromCloud(expenseId: string | number): Promise<void> {
  const path = `expenses/${expenseId}`;
  try {
    if (!auth.currentUser) return;
    const docRef = doc(db, "expenses", String(expenseId));
    await deleteDoc(docRef);
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, path);
  }
}

export async function syncAllExpensesBatch(expenses: GeneralExpense[], ownerUid?: string): Promise<void> {
  try {
    const uid = ownerUid || auth.currentUser?.uid;
    if (!uid || expenses.length === 0) return;
    const batch = writeBatch(db);
    expenses.forEach((exp) => {
      const docRef = doc(db, "expenses", String(exp.id));
      batch.set(docRef, { ...exp, ownerUid: uid }, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, "expenses/batch");
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
      handleFirestoreError(error, OperationType.GET, `settings/${ownerUid}`);
      if (onError) onError(error);
    }
  );
}

export async function syncSettingsToCloud(settings: AgencySettings, ownerUid?: string): Promise<void> {
  const uid = ownerUid || auth.currentUser?.uid;
  if (!uid) return;
  const path = `settings/${uid}`;
  try {
    const docRef = doc(db, "settings", uid);
    await setDoc(docRef, { ...settings, ownerUid: uid }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
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

