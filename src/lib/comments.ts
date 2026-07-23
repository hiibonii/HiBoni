import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  collectionGroup,
  getCountFromServer,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { CommentDoc } from "@/types";

export interface CommentTarget {
  storyId: string;
  chapterId?: string; // only for type = "story"
  partId?: string; // only for type = "story"
}

// Blog comments live at stories/{storyId}/comments.
// Story-part comments live nested under the specific part, so each part has
// its own independent comment thread:
// stories/{storyId}/chapters/{chapterId}/parts/{partId}/comments
function commentsCollection({ storyId, chapterId, partId }: CommentTarget) {
  if (chapterId && partId) {
    return collection(
      db,
      "stories",
      storyId,
      "chapters",
      chapterId,
      "parts",
      partId,
      "comments"
    );
  }
  return collection(db, "stories", storyId, "comments");
}

// Paginated — a popular thread with hundreds/thousands of comments would
// otherwise mean downloading every single one on every page view. Loads the
// oldest `pageSize` first; call again with `cursor` (the previous page's
// lastDoc) to load more, via the "Load More" button in CommentSection.
export async function getComments(
  target: CommentTarget,
  opts?: { pageSize?: number; cursor?: QueryDocumentSnapshot | null }
) {
  const constraints: any[] = [orderBy("createdAt", "asc")];
  constraints.push(limit(opts?.pageSize || 20));
  if (opts?.cursor) constraints.push(startAfter(opts.cursor));

  const snap = await getDocs(query(commentsCollection(target), ...constraints));
  return {
    items: snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommentDoc)),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
  };
}

// Cheap aggregate count for the "Comments (N)" header — independent of how
// many comments have actually been paginated/loaded into the list.
export async function getCommentCount(target: CommentTarget) {
  const snap = await getCountFromServer(query(commentsCollection(target)));
  return snap.data().count;
}

export async function addComment(
  target: CommentTarget,
  data: { text: string; authorUid: string; authorName: string; authorPhotoURL: string }
) {
  const createdAt = Date.now();
  const ref = await addDoc(commentsCollection(target), { ...data, createdAt });
  // Returned so the UI can append the new comment locally instead of
  // re-fetching the whole (paginated) list just to show one new item.
  return { id: ref.id, ...data, createdAt } as CommentDoc;
}

export async function deleteComment(target: CommentTarget, commentId: string) {
  await deleteDoc(doc(commentsCollection(target), commentId));
}

// Uses a Firestore aggregate count query (no document downloads) across
// every "comments" subcollection in the whole database — cheap even as
// comment volume grows, and needs no extra Firestore index since it has no
// where()/orderBy() clauses.
export async function getTotalCommentCount() {
  const snap = await getCountFromServer(query(collectionGroup(db, "comments")));
  return snap.data().count;
}
