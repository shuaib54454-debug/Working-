import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, getDocFromServer, writeBatch, query, where, Unsubscribe } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail, updatePassword as firebaseUpdatePassword, User, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";
import { Candidate, GeneralExpense, AgencySettings, ActivityLogEntry } from "../types";
import { compressImage } from "./imageUtils";
import { readLegacySensitiveValue } from "./sensitiveLocalCache";
import { STORAGE_KEYS } from "../data/initialData";

export type WorkerStorageFolder = "passport" | "photo" | "contract" | "visa" | "medical" | "coc" | "documents";
const OWNER_EMAIL = "shuaib54454@gmail.com";
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
if (typeof window !== "undefined") { (async () => { try { await setPersistence(auth, browserLocalPersistence); } catch { try { await setPersistence(auth, browserSessionPersistence); } catch { await setPersistence(auth, inMemoryPersistence).catch(() => {}); } } })(); }
async function withDbRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 350): Promise<T> { let attempt = 0; while (true) { try { return await fn(); } catch (err: any) { const msg = err?.message || String(err); const isDbClosing = msg.includes("Database is closing") || msg.includes("Database is closing/hidden") || msg.includes("The database connection is closing") || err?.name === "InvalidStateError"; if (isDbClosing && attempt < retries) { attempt++; await new Promise(resolve => setTimeout(resolve, delayMs)); continue; } throw err; } } }
const rawDbId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;
const databaseId = rawDbId && rawDbId !== "(default)" ? rawDbId : undefined;
let firestoreInstance;
try { firestoreInstance = initializeFirestore(app, { experimentalForceLongPolling: true, experimentalAutoDetectLongPolling: true }, databaseId); } catch { firestoreInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app); }
export const db = firestoreInstance; export const storage = getStorage(app);
export enum OperationType { CREATE = "create", UPDATE = "update", DELETE = "delete", LIST = "list", GET = "get", WRITE = "write" }
export interface FirestoreErrorInfo { error: string; operationType: OperationType; path: string | null; }
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) { const errInfo: FirestoreErrorInfo = { error: error instanceof Error ? error.message : String(error), operationType, path }; console.error("Firestore Error:", errInfo.error, operationType, path); return errInfo; }
function assertOwnerEmail(email: string): void { if (email.trim().toLowerCase() !== OWNER_EMAIL) throw new Error("This application is restricted to the owner account."); }
export async function loginWithEmail(email: string, pass: string): Promise<User> { assertOwnerEmail(email); return withDbRetry(async () => { const cred = await signInWithEmailAndPassword(auth, email.trim(), pass); if ((cred.user.email || "").toLowerCase() !== OWNER_EMAIL) { await firebaseSignOut(auth).catch(() => {}); throw new Error("This application is restricted to the owner account."); } return cred.user; }); }
export async function registerOwnerAccount(email: string, pass: string): Promise<User> { assertOwnerEmail(email); return withDbRetry(async () => (await createUserWithEmailAndPassword(auth, email.trim(), pass)).user); }
export interface AppUser { uid: string; email: string | null; displayName?: string | null; isLocal?: boolean; }
let localUserListener: ((user: User | AppUser | null) => void) | null = null;
export async function logoutUser(): Promise<void> {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("shuayb_explicit_logout", "true");
    localStorage.removeItem("shuayb_local_user");
  }
  if (localUserListener) localUserListener(null);
  return withDbRetry(async () => {
    await firebaseSignOut(auth).catch(() => {});
  });
}
export async function resetUserPassword(email: string): Promise<void> { assertOwnerEmail(email); return withDbRetry(async () => { await sendPasswordResetEmail(auth, email.trim()); }); }
export async function changeCurrentUserPassword(newPassword: string): Promise<void> { const user = auth.currentUser; if (!user) throw new Error("No authenticated user"); assertOwnerEmail(user.email || ""); return withDbRetry(async () => { await firebaseUpdatePassword(user, newPassword); }); }
export function setLocalUser(_user: AppUser | null): void {
  // Local authentication is intentionally disabled. Firebase Auth is the only trust source.
  if (typeof window !== "undefined") localStorage.removeItem("shuayb_local_user");
}
export function subscribeToAuth(callback: (user: User | AppUser | null) => void): Unsubscribe {
  localUserListener = callback;
  const unsub = onAuthStateChanged(auth, async firebaseUser => {
    if (!firebaseUser) {
      callback(null);
      return;
    }
    if ((firebaseUser.email || "").toLowerCase() !== OWNER_EMAIL) {
      await firebaseSignOut(auth).catch(() => {});
      callback(null);
      return;
    }
    callback(firebaseUser);
  });
  return () => {
    unsub();
    localUserListener = null;
  };
}
export async function testFirebaseConnection(): Promise<boolean> { try { if (!auth.currentUser) return false; await getDocFromServer(doc(db, "_system", "connection_check")); return true; } catch (error: any) { const errorMsg = error?.message || ""; if (errorMsg.includes("offline") || errorMsg.includes("unavailable") || errorMsg.includes("Database is closing")) console.warn("Firebase is temporarily unavailable"); return false; } }
export function subscribeToCandidates(ownerUid: string, onUpdate: (candidates: Candidate[]) => void, onError?: (err: Error) => void): Unsubscribe { const q = query(collection(db, "candidates"), where("ownerUid", "==", ownerUid)); return onSnapshot(q, snapshot => { const list: Candidate[] = []; snapshot.forEach(d => list.push(d.data() as Candidate)); onUpdate(list); }, error => { handleFirestoreError(error, OperationType.LIST, "candidates"); onError?.(error); }); }
export async function syncCandidateToCloud(candidate: Candidate, ownerUid?: string): Promise<void> {
  const uid = ownerUid || auth.currentUser?.uid;
  if (!auth.currentUser || !uid) return;
  try {
    await withDbRetry(() => setDoc(doc(db, "candidates", candidate.id), { ...candidate, ownerUid: uid }, { merge: true }));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `candidates/${candidate.id}`);
    throw e;
  }
}
export async function deleteCandidateFromCloud(candidateId: string, storagePaths: string[] = []): Promise<void> {
  if (!auth.currentUser) throw new Error("Authentication required");
  const uniquePaths = [...new Set(storagePaths.filter(Boolean))];
  try {
    // Delete linked Storage objects first. If this fails, keep the Firestore record intact
    // so the user can retry instead of silently creating an orphaned/partial deletion.
    for (const storagePath of uniquePaths) {
      try {
        await withDbRetry(() => deleteObject(storageRef(storage, storagePath)));
      } catch (storageError: any) {
        const code = storageError?.code || "";
        if (code !== "storage/object-not-found") throw storageError;
      }
    }
    await withDbRetry(() => deleteDoc(doc(db, "candidates", candidateId)));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `candidates/${candidateId}`);
    throw e;
  }
}
export async function bulkArchiveCandidatesInCloud(candidateIds: string[], ownerUid?: string, candidatesData?: Candidate[]): Promise<void> { const uid = ownerUid || auth.currentUser?.uid; if (!auth.currentUser || !uid || candidateIds.length === 0) return; try { await withDbRetry(async () => { const batch = writeBatch(db); const nowIso = new Date().toISOString(); const map = new Map((candidatesData || []).map(c => [c.id, c])); candidateIds.forEach(id => batch.set(doc(db, "candidates", id), { ...(map.get(id) || {}), archived: true, ownerUid: uid, updatedAt: nowIso }, { merge: true })); await batch.commit(); }); } catch (e) { handleFirestoreError(e, OperationType.WRITE, "candidates/bulkArchive"); throw e; } }
export async function bulkRestoreCandidatesInCloud(candidateIds: string[], ownerUid?: string, candidatesData?: Candidate[]): Promise<void> { const uid = ownerUid || auth.currentUser?.uid; if (!auth.currentUser || !uid || candidateIds.length === 0) return; try { await withDbRetry(async () => { const batch = writeBatch(db); const nowIso = new Date().toISOString(); const map = new Map((candidatesData || []).map(c => [c.id, c])); candidateIds.forEach(id => batch.set(doc(db, "candidates", id), { ...(map.get(id) || {}), archived: false, ownerUid: uid, updatedAt: nowIso }, { merge: true })); await batch.commit(); }); } catch (e) { handleFirestoreError(e, OperationType.WRITE, "candidates/bulkRestore"); throw e; } }
export function subscribeToExpenses(ownerUid: string, onUpdate: (expenses: GeneralExpense[]) => void, onError?: (err: Error) => void): Unsubscribe { const q = query(collection(db, "expenses"), where("ownerUid", "==", ownerUid)); return onSnapshot(q, snapshot => { const list: GeneralExpense[] = []; snapshot.forEach(d => list.push(d.data() as GeneralExpense)); onUpdate(list); }, error => { handleFirestoreError(error, OperationType.LIST, "expenses"); onError?.(error); }); }
export async function syncExpenseToCloud(expense: GeneralExpense, ownerUid?: string): Promise<void> {
  const uid = ownerUid || auth.currentUser?.uid;
  if (!auth.currentUser || !uid) return;
  try {
    await withDbRetry(() => setDoc(doc(db, "expenses", String(expense.id)), { ...expense, ownerUid: uid }, { merge: true }));
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `expenses/${expense.id}`);
    throw e;
  }
}
export async function deleteExpenseFromCloud(id: string): Promise<void> {
  if (!auth.currentUser) throw new Error("Authentication required");
  try {
    await withDbRetry(() => deleteDoc(doc(db, "expenses", String(id))));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `expenses/${id}`);
    throw e;
  }
}
export async function(id: string): Promise<void> { if (!auth.currentUser) return; try { await withDbRetry(() => deleteDoc(doc(db, "expenses", id))); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `expenses/${id}`); } }
export async function syncAllExpensesBatch(expenses: GeneralExpense[], ownerUid?: string): Promise<void> { const uid = ownerUid || auth.currentUser?.uid; if (!auth.currentUser || !uid || expenses.length === 0) return; try { await withDbRetry(async () => { const batch = writeBatch(db); expenses.forEach(e => batch.set(doc(db, "expenses", String(e.id)), { ...e, ownerUid: uid }, { merge: true })); await batch.commit(); }); } catch (e) { handleFirestoreError(e, OperationType.WRITE, "expenses/batch"); } }
export function subscribeToSettings(ownerUid: string, onUpdate: (settings: AgencySettings | null) => void, onError?: (err: Error) => void): Unsubscribe { const ref = doc(db, "settings", ownerUid); return onSnapshot(ref, d => onUpdate(d.exists() ? d.data() as AgencySettings : null), error => { handleFirestoreError(error, OperationType.GET, `settings/${ownerUid}`); onError?.(error); }); }
export async function syncSettingsToCloud(settings: AgencySettings, ownerUid?: string): Promise<void> { const uid = ownerUid || auth.currentUser?.uid; if (!auth.currentUser || !uid) return; try { await withDbRetry(() => setDoc(doc(db, "settings", uid), { ...settings, ownerUid: uid }, { merge: true })); } catch (e) { handleFirestoreError(e, OperationType.WRITE, `settings/${uid}`); } }
export function subscribeToActivities(onUpdate: (activities: ActivityLogEntry[]) => void, onError?: (err: Error) => void): Unsubscribe { const uid = auth.currentUser?.uid; if (!uid) return () => {}; const q = query(collection(db, "activities"), where("ownerUid", "==", uid)); return onSnapshot(q, snapshot => { const list: ActivityLogEntry[] = []; snapshot.forEach(d => list.push(d.data() as ActivityLogEntry)); onUpdate(list); }, error => { handleFirestoreError(error, OperationType.LIST, "activities"); onError?.(error); }); }
export async function syncActivityToCloud(activity: ActivityLogEntry): Promise<void> { const uid = auth.currentUser?.uid; if (!auth.currentUser || !uid) return; try { await withDbRetry(() => setDoc(doc(db, "activities", activity.id), { ...activity, ownerUid: uid }, { merge: true })); } catch (e) { handleFirestoreError(e, OperationType.WRITE, `activities/${activity.id}`); } }
function dataUrlToBlob(dataUrl: string): Blob { const match = dataUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/s); if (!match) throw new Error("Invalid compressed image data"); const mimeType = match[1] || "image/jpeg"; const binary = atob(match[2]); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return new Blob([bytes], { type: mimeType }); }
export async function uploadWorkerDocument(candidateId: string, folder: WorkerStorageFolder, fileOrBlob: File | Blob, customFileName?: string): Promise<{ downloadUrl: string; storagePath: string; docId: string; fileName: string; sizeBytes: number; isPdf: boolean }> { const uid = auth.currentUser?.uid; if (!auth.currentUser || !uid) throw new Error("Authentication required"); const cleanCandidateId = candidateId.replace(/[^a-zA-Z0-9_-]/g, "_"); const fileName = (customFileName || (fileOrBlob instanceof File ? fileOrBlob.name : "document")).replace(/[^a-zA-Z0-9._-]/g, "_"); const docId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const path = `workers/${cleanCandidateId}/${folder}/${docId}-${fileName}`; const isPdf = (fileOrBlob.type || "").toLowerCase() === "application/pdf"; if (isPdf && fileOrBlob.size > 3 * 1024 * 1024) throw new Error("PDF file is too large"); if (!isPdf && !fileOrBlob.type.toLowerCase().startsWith("image/")) throw new Error("Only images and PDF files are allowed"); let uploadBlob: Blob = fileOrBlob; if (!isPdf) { const compressedDataUrl = await compressImage(fileOrBlob, { maxWidth: 1400, maxHeight: 1400, quality: 0.82, mimeType: "image/jpeg" }); uploadBlob = dataUrlToBlob(compressedDataUrl); } const fileRef = storageRef(storage, path); try { const snapshot = await uploadBytes(fileRef, uploadBlob, { contentType: uploadBlob.type || (isPdf ? "application/pdf" : "image/jpeg"), customMetadata: { ownerUid: uid, candidateId: cleanCandidateId, docId, folder, uploadedAt: new Date().toISOString() } }); const downloadUrl = await getDownloadURL(snapshot.ref); return { downloadUrl, storagePath: path, docId, fileName, sizeBytes: uploadBlob.size, isPdf }; } catch (error) { console.error("Worker document upload failed:", error instanceof Error ? error.message : String(error)); throw new Error("Unable to securely upload the document. Please check your connection and try again."); } }
export async function deleteWorkerDocument(storagePath: string): Promise<void> { if (!auth.currentUser) throw new Error("Authentication required"); try { await deleteObject(storageRef(storage, storagePath)); } catch (e) { handleFirestoreError(e, OperationType.DELETE, storagePath); throw e; } }
async function migrateCandidatesStrict(candidates: Candidate[], ownerUid: string): Promise<void> { if (!auth.currentUser || candidates.length === 0) return; await withDbRetry(async () => { for (let i = 0; i < candidates.length; i += 450) { const batch = writeBatch(db); candidates.slice(i, i + 450).forEach(c => batch.set(doc(db, "candidates", c.id), { ...c, ownerUid }, { merge: true })); await batch.commit(); } }); }
async function migrateExpensesStrict(expenses: GeneralExpense[], ownerUid: string): Promise<void> { if (!auth.currentUser || expenses.length === 0) return; await withDbRetry(async () => { for (let i = 0; i < expenses.length; i += 450) { const batch = writeBatch(db); expenses.slice(i, i + 450).forEach(e => batch.set(doc(db, "expenses", String(e.id)), { ...e, ownerUid }, { merge: true })); await batch.commit(); } }); }
async function migrateActivitiesStrict(activities: ActivityLogEntry[], ownerUid: string): Promise<void> { if (!auth.currentUser || activities.length === 0) return; await withDbRetry(async () => { for (let i = 0; i < activities.length; i += 450) { const batch = writeBatch(db); activities.slice(i, i + 450).forEach(a => batch.set(doc(db, "activities", a.id), { ...a, ownerUid }, { merge: true })); await batch.commit(); } }); }
export async function autoMigrateExistingDataToOwner(ownerUid: string, currentCandidates: Candidate[], currentExpenses: GeneralExpense[], currentSettings: AgencySettings, currentActivities?: ActivityLogEntry[]): Promise<{ candidatesMigrated: number; expensesMigrated: number; activitiesMigrated: number; settingsMigrated: boolean }> { if (!auth.currentUser || auth.currentUser.uid !== ownerUid || (auth.currentUser.email || "").toLowerCase() !== OWNER_EMAIL) return { candidatesMigrated: 0, expensesMigrated: 0, activitiesMigrated: 0, settingsMigrated: false }; const activities = currentActivities ?? (() => { try { const raw = readLegacySensitiveValue(STORAGE_KEYS.activities); return raw ? JSON.parse(raw) as ActivityLogEntry[] : []; } catch { return []; } })(); const candidatesToMigrate = currentCandidates.filter(c => !c.ownerUid || c.ownerUid === ownerUid); const expensesToMigrate = currentExpenses.filter(e => !e.ownerUid || e.ownerUid === ownerUid); const activitiesToMigrate = activities.filter(a => !a.ownerUid || a.ownerUid === ownerUid).map(a => ({ ...a, ownerUid })); let candidatesMigrated = 0, expensesMigrated = 0, activitiesMigrated = 0, settingsMigrated = false; if (candidatesToMigrate.length) { await migrateCandidatesStrict(candidatesToMigrate, ownerUid); candidatesMigrated = candidatesToMigrate.length; } if (expensesToMigrate.length) { await migrateExpensesStrict(expensesToMigrate, ownerUid); expensesMigrated = expensesToMigrate.length; } if (activitiesToMigrate.length) { await migrateActivitiesStrict(activitiesToMigrate, ownerUid); activitiesMigrated = activitiesToMigrate.length; } if (currentSettings && Object.keys(currentSettings).length) { await withDbRetry(() => setDoc(doc(db, "settings", ownerUid), { ...currentSettings, ownerUid }, { merge: true })); settingsMigrated = true; } return { candidatesMigrated, expensesMigrated, activitiesMigrated, settingsMigrated }; }
