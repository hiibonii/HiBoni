import {
  collection,
  doc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { StoryDoc } from "@/types";

const bookmarksCol = (uid: string) => collection(db, "users", uid, "bookmarks");

export async function isBookmarked(uid: string, storyId: string): Promise<boolean> {
  const snap = await getDoc(doc(bookmarksCol(uid), storyId));
  return snap.exists();
}

export async function addBookmark(uid: string, storyId: string) {
  await setDoc(doc(bookmarksCol(uid), storyId), { storyId, createdAt: Date.now() });
}

export async function removeBookmark(uid: string, storyId: string) {
  await deleteDoc(doc(bookmarksCol(uid), storyId));
}

// Returns the user's bookmarked stories, newest-saved first. The bookmark
// doc itself stores ONLY the storyId + when it was saved — never a
// snapshot of title/cover/etc — so a bookmark always reflects the story's
// CURRENT state. This is the same "store the immutable reference, resolve
// everything else live" pattern used for story.categoryId elsewhere in
// this app, applied here for the same reason: a snapshot would go stale
// the moment the author edits the story.
//
// Silently skips any bookmark pointing at a story that's since been
// deleted, or unpublished by its author (their content, their call) —
// rather than erroring the whole list out.
export async function getBookmarkedStories(uid: string): Promise<StoryDoc[]> {
  const snap = await getDocs(query(bookmarksCol(uid), orderBy("createdAt", "desc")));
  const storyDocs = await Promise.all(
    snap.docs.map(async (d) => {
      try {
        const storySnap = await getDoc(doc(db, "stories", d.id));
        return storySnap.exists()
          ? ({ id: storySnap.id, ...storySnap.data() } as StoryDoc)
          : null;
      } catch {
        return null;
      }
    })
  );
  return storyDocs.filter((s): s is StoryDoc => s !== null);
}