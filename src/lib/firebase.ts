import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeFirestore,
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
  getDownloadURL
} from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";
import { Candidate, GeneralExpense, AgencySettings } from "../types";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Auth persistence error:", err);
});

const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true
    },
    databaseId
  );
} catch {
  firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

export const db = firestoreInstance;

export const storage = getStorage(app);

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

export async function testFirebaseConnection(): Promise<boolean> {
  try {
    if (!auth.currentUser) return true;
    await getDocFromServer(doc(db, "_system", "connection_check"));
    console.log("Firebase Firestore connected successfully");
    return true;
  } catch (error: any) {
    if (
      error instanceof Error &&
      (error.message.includes("the client is offline") ||
       error.message.includes("unavailable") ||
       error.message.includes("offline"))
    ) {
      console.warn("Firebase client is currently in offline mode / reconnecting");
    } else {
      console.log("Firebase Firestore initialized:", error?.message || "ready");
    }
    return false;
  }
}

export function subscribeToCandidates(
  ownerUid: string,
  onUpdate: (candidates: Candidate[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, "candidates"), where("ownerUid", "==", ownerUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: Candidate[] = [];
      snapshot.forEach((docSnap) => list.push(docSnap.data() as Candidate));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, "candidates");
      onError?.(error);
    }
  );
}

export async function syncCandidateToCloud(candidate: Candidate, ownerUid?: string): Promise<void> {
  const uid = ownerUid || auth.currentUser?.uid;
  if (!uid) return;
  const path = `candidates/${candidate.id}`;
  try {
    await setDoc(doc(db, "candidates", candidate.id), { ...candidate, ownerUid: uid }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function deleteCandidateFromCloud(candidateId: string): Promise<void> {
  const path = `candidates/${candidateId}`;
  try {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, "candidates", candidateId));
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
      batch.set(doc(db, "candidates", cand.id), { ...cand, ownerUid: uid }, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, "candidates/batch");
  }
}

export function subscribeToExpenses(
  ownerUid: string,
  onUpdate: (expenses: GeneralExpense[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, "expenses"), where("ownerUid", "==", ownerUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: GeneralExpense[] = [];
      snapshot.forEach((docSnap) => list.push(docSnap.data() as GeneralExpense));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, "expenses");
      onError?.(error);
    }
  );
}

export async function syncExpenseToCloud(expense: GeneralExpense, ownerUid?: string): Promise<void> {
  const uid = ownerUid || auth.currentUser?.uid;
  if (!uid) return;
  const path = `expenses/${expense.id}`;
  try {
    await setDoc(doc(db, "expenses", String(expense.id)), { ...expense, ownerUid: uid }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

export async function deleteExpenseFromCloud(expenseId: string | number): Promise<void> {
  const path = `expenses/${expenseId}`;
  try {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, "expenses", String(expenseId)));
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
      batch.set(doc(db, "expenses", String(exp.id)), { ...exp, ownerUid: uid }, { merge: true });
    });
    await batch.commit();
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, "expenses/batch");
  }
}

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
        if (data.ownerUid === ownerUid) onUpdate(data);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `settings/${ownerUid}`);
      onError?.(error);
    }
  );
}

export async function syncSettingsToCloud(settings: AgencySettings, ownerUid?: string): Promise<void> {
  const uid = ownerUid || auth.currentUser?.uid;
  if (!uid) return;
  const path = `settings/${uid}`;
  try {
    await setDoc(doc(db, "settings", uid), { ...settings, ownerUid: uid }, { merge: true });
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, path);
  }
}

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

// Only migrate genuinely unowned legacy records. Never reassign a record that
// already belongs to a different authenticated owner on the same device.
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
    const candToMigrate = currentCandidates
      .filter((c) => !c.ownerUid || c.ownerUid === ownerUid)
      .map((c) => ({ ...c, ownerUid: ownerUid }));
    if (candToMigrate.length > 0) {
      await syncAllCandidatesBatch(candToMigrate, ownerUid);
      candidatesMigrated = candToMigrate.length;
    }

    const expToMigrate = currentExpenses
      .filter((e) => !e.ownerUid || e.ownerUid === ownerUid)
      .map((e) => ({ ...e, ownerUid: ownerUid }));
    if (expToMigrate.length > 0) {
      await syncAllExpensesBatch(expToMigrate, ownerUid);
      expensesMigrated = expToMigrate.length;
    }

    const settingsOwner = (currentSettings as AgencySettings & { ownerUid?: string }).ownerUid;
    if (!settingsOwner || settingsOwner === ownerUid) {
      await syncSettingsToCloud({ ...currentSettings, ownerUid }, ownerUid);
      settingsMigrated = true;
    }

    console.log(`Migration completed for owner ${ownerUid}: ${candidatesMigrated} candidates, ${expensesMigrated} expenses.`);
  } catch (err) {
    console.error("Data migration error:", err);
  }

  return { candidatesMigrated, expensesMigrated, settingsMigrated };
}
