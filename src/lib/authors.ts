import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { AuthorProfile } from "@/types";

// Per-uid cache — a page typically shows a handful of distinct authors at
// most, so caching individual profile fetches is enough (no need for the
// "cache the whole collection" pattern used for categories, since we can
// never list all authorProfiles for privacy/cost reasons — only fetch by
// known uid).
const cache = new Map<string, Promise<AuthorProfile | null>>();

async function fetchAuthorProfile(uid: string): Promise<AuthorProfile | null> {
  const snap = await getDoc(doc(db, "authorProfiles", uid));
  return snap.exists() ? (snap.data() as AuthorProfile) : null;
}

export function getAuthorProfileCached(uid: string): Promise<AuthorProfile | null> {
  if (!cache.has(uid)) {
    cache.set(uid, fetchAuthorProfile(uid));
  }
  return cache.get(uid)!;
}

// Resolves a story's authorId to a display name, falling back gracefully
// for stories created before authorId existed (see syncStoriesToAuthorId)
// or if the author's profile doc is somehow missing.
export async function getAuthorDisplayName(authorId?: string): Promise<string | null> {
  if (!authorId) return null;
  const profile = await getAuthorProfileCached(authorId);
  return profile?.displayName || null;
}