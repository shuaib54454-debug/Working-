import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";

const projectId = "demo-shuayb-rules";

const env = await initializeTestEnvironment({
  projectId,
  firestore: {
    rules: readFileSync("firestore.rules", "utf8"),
  },
  storage: {
    rules: readFileSync("storage.rules", "utf8"),
  },
});

try {
  const owner = env.authenticatedContext("owner-a");
  const other = env.authenticatedContext("owner-b");
  const admin = env.authenticatedContext("admin-a", { email: "admin@example.com", admin: true });

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "candidates/CAND-1"), {
      ownerUid: "owner-a",
      firstName: "Abebe",
      lastName: "Kebede",
    });
    await setDoc(doc(db, "candidates/CAND-2"), {
      ownerUid: "owner-b",
      firstName: "Ali",
      lastName: "Hassan",
    });
    await setDoc(doc(db, "expenses/EXP-1"), { ownerUid: "owner-a", amount: 100 });
    await setDoc(doc(db, "settings/owner-a"), { ownerUid: "owner-a", agencyName: "Shuayb" });
    await setDoc(doc(db, "admins/admin-a"), { role: "admin" });
  });

  assert.equal((await getDoc(doc(owner.firestore(), "candidates/CAND-1"))).exists(), true);
  await assertFails(getDoc(doc(other.firestore(), "candidates/CAND-1")));
  await assertSucceeds(getDoc(doc(admin.firestore(), "candidates/CAND-1")));

  await assertSucceeds(updateDoc(doc(owner.firestore(), "candidates/CAND-1"), { firstName: "New" }));
  await assertFails(updateDoc(doc(owner.firestore(), "candidates/CAND-1"), { ownerUid: "owner-b" }));
  await assertFails(deleteDoc(doc(other.firestore(), "candidates/CAND-1")));
  await assertSucceeds(deleteDoc(doc(admin.firestore(), "candidates/CAND-2")));

  await assertSucceeds(setDoc(doc(owner.firestore(), "candidates/CAND-3"), {
    ownerUid: "owner-a",
    firstName: "New",
    lastName: "Candidate",
  }));
  await assertFails(setDoc(doc(owner.firestore(), "candidates/CAND-4"), {
    ownerUid: "owner-b",
    firstName: "Cross",
    lastName: "Owner",
  }));

  await assertSucceeds(getDoc(doc(owner.firestore(), "settings/owner-a")));
  await assertFails(getDoc(doc(other.firestore(), "settings/owner-a")));
  await assertFails(setDoc(doc(other.firestore(), "settings/owner-a"), { ownerUid: "owner-b" }));
  await assertSucceeds(getDoc(doc(owner.firestore(), "admins/owner-a")));
  await assertFails(setDoc(doc(owner.firestore(), "admins/owner-b"), { role: "admin" }));

  const ownerStorage = owner.storage();
  const otherStorage = other.storage();
  const adminStorage = admin.storage();
  const ownerRef = ownerStorage.ref("workers/CAND-1/passport/passport.pdf");
  const otherRef = otherStorage.ref("workers/CAND-1/passport/passport.pdf");

  await assertSucceeds(ownerRef.put(new Uint8Array([1, 2, 3]), {
    contentType: "application/pdf",
    customMetadata: { ownerUid: "owner-a" },
  }));
  await assertSucceeds(ownerRef.getMetadata());
  await assertFails(otherRef.getMetadata());
  await assertFails(otherRef.put(new Uint8Array([4, 5]), {
    contentType: "application/pdf",
    customMetadata: { ownerUid: "owner-b" },
  }));
  await assertFails(ownerStorage.ref("workers/CAND-1/passport/bad.txt").put(new Uint8Array([1]), {
    contentType: "text/plain",
    customMetadata: { ownerUid: "owner-a" },
  }));
  await assertSucceeds(adminStorage.ref("workers/CAND-1/passport/passport.pdf").getMetadata());

  console.log("Firebase Firestore + Storage rules tests passed.");
} finally {
  await env.cleanup();
}
