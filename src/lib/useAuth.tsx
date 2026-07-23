"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { ensureUserDoc } from "./usersStore";
import { UserRole } from "@/types";

interface Profile {
  displayName: string | null;
  photoURL: string | null;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  role: UserRole;
  // Live display name/photo — sourced from the same Firestore doc as
  // `role` (see the onSnapshot subscription below), so a profile edit made
  // from /dashboard/profile shows up everywhere instantly, without needing
  // a Firebase Auth token refresh or re-login. Falls back to the Firebase
  // Auth user's own name/photo until the Firestore doc has loaded.
  profile: Profile;
  isSuperAdmin: boolean;
  isCreator: boolean;
  // True for anyone allowed into /dashboard at all (super_admin or creator).
  canWriteStories: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  role: "user",
  profile: { displayName: null, photoURL: null },
  isSuperAdmin: false,
  isCreator: false,
  canWriteStories: false,
  login: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [profile, setProfile] = useState<Profile>({ displayName: null, photoURL: null });
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        // First sign-in creates the private users/{uid} doc (role defaults
        // to "user" — self-creation can never grant creator/super_admin,
        // see firestore.rules). No-op if the doc already exists.
        await ensureUserDoc(u).catch(() => {});
      } else {
        setRole("user");
        setProfile({ displayName: null, photoURL: null });
        setRoleLoading(false);
      }
    });
    return unsub;
  }, []);

  // Live-subscribe to the signed-in user's own private account doc, so a
  // role promotion by a super_admin — or a profile edit the person makes
  // themself on /dashboard/profile — takes effect immediately everywhere,
  // with no logout/login or manual refresh needed.
  useEffect(() => {
    if (!user) return;
    setRoleLoading(true);
    // Seed with whatever Firebase Auth already knows, so the UI has a
    // sensible name/photo to show for the instant before Firestore's first
    // snapshot arrives.
    setProfile({ displayName: user.displayName, photoURL: user.photoURL });
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const data = snap.data();
        setRole((data?.role as UserRole) || "user");
        setProfile({
          displayName: data?.displayName ?? user.displayName,
          photoURL: data?.photoURL ?? user.photoURL,
        });
        setRoleLoading(false);
      },
      () => setRoleLoading(false)
    );
    return unsub;
  }, [user]);

  const loading = authLoading || (!!user && roleLoading);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isSuperAdmin = role === "super_admin";
  const isCreator = role === "creator";

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        role,
        profile,
        isSuperAdmin,
        isCreator,
        canWriteStories: isSuperAdmin || isCreator,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}