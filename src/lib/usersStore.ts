import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { UserDoc, UserRole } from "@/types";

const usersCol = collection(db, "users");
const authorProfilesCol = collection(db, "authorProfiles");

// Called once per sign-in (see useAuth). On the very FIRST login for an
// account, creates the private account record with role "user" — Firestore
// rules only allow a user to self-create their OWN doc with role "user",
// so this can never be used to self-promote — and seeds the public
// authorProfiles doc from whatever Firebase Auth already knows.
//
// On every login AFTER that, this is a no-op: it must NOT touch either doc
// again, or it would silently overwrite a name/photo the person
// deliberately set via /dashboard/profile back to Firebase Auth's raw
// values (which, for an email/password account, is usually blank — that
// was actually happening here and is why bylines kept reverting).
export async function ensureUserDoc(user: User): Promise<UserDoc> {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) return snap.data() as UserDoc;

  const newUser: UserDoc = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: "user",
    createdAt: Date.now(),
  };
  await setDoc(ref, newUser);
  await setDoc(doc(authorProfilesCol, user.uid), {
    uid: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
  });
  return newUser;
}

// Super-admin only (enforced by firestore.rules) — full user directory for
// the /dashboard/users management page.
export async function getAllUsers(): Promise<UserDoc[]> {
  const snap = await getDocs(query(usersCol, orderBy("createdAt", "asc")));
  return snap.docs.map((d) => d.data() as UserDoc);
}

// Super-admin only. Firestore rules restrict this update to ONLY the
// `role` field — so even if this function is called with bad data, nothing
// else on the target's private account doc can change through this path.
export async function updateUserRole(uid: string, role: UserRole) {
  await updateDoc(doc(db, "users", uid), { role });
}

// Self-service — any signed-in staff member updates their OWN display
// name/photo. Firestore rules restrict the users/{uid} update to exactly
// these two fields (see firestore.rules), so this can never touch role.
// Mirrors the same values into the public authorProfiles doc so bylines on
// stories stay in sync immediately.
export async function updateOwnProfile(
  uid: string,
  data: { displayName?: string; photoURL?: string }
) {
  await updateDoc(doc(db, "users", uid), data);
  await setDoc(doc(authorProfilesCol, uid), { uid, ...data }, { merge: true });
}