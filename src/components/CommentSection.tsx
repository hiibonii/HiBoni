"use client";

import { useEffect, useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { useAuth } from "@/lib/useAuth";
import {
  addComment,
  deleteComment,
  getComments,
  getCommentCount,
  CommentTarget,
} from "@/lib/comments";
import { CommentDoc } from "@/types";

const PAGE_SIZE = 20;

export default function CommentSection({
  target,
  commentsEnabled,
  canModerate = false,
}: {
  target: CommentTarget;
  // Per-story setting (set by the owner in the editor). Defaults to enabled
  // if the story predates this field.
  commentsEnabled?: boolean;
  // True if the current user may delete ANY comment here: a super_admin
  // always, or a creator who owns this specific story. Computed by the
  // parent (DetailClient), which already has the story's authorId.
  canModerate?: boolean;
}) {
  const { user, loginWithGoogle } = useAuth();
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [cursor, setCursor] = useState<any>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posting, setPosting] = useState(false);
  const enabled = commentsEnabled !== false;

  const load = async () => {
    setLoading(true);
    const [{ items, lastDoc }, count] = await Promise.all([
      getComments(target, { pageSize: PAGE_SIZE }),
      getCommentCount(target),
    ]);
    setComments(items);
    setCursor(lastDoc);
    setHasMore(items.length === PAGE_SIZE);
    setTotalCount(count);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.storyId, target.chapterId, target.partId]);

  const loadMore = async () => {
    setLoadingMore(true);
    const { items, lastDoc } = await getComments(target, {
      pageSize: PAGE_SIZE,
      cursor,
    });
    setComments((prev) => [...prev, ...items]);
    setCursor(lastDoc);
    setHasMore(items.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const handlePost = async () => {
    if (!user || !text.trim() || !enabled) return;
    setPosting(true);
    try {
      // Append locally instead of re-fetching the whole (paginated) thread
      // just to show the one comment we already know we just added.
      const newComment = await addComment(target, {
        text: text.trim(),
        authorUid: user.uid,
        authorName: user.displayName || "Anonymous",
        authorPhotoURL: user.photoURL || "",
      });
      setText("");
      setComments((prev) => [...prev, newComment]);
      setTotalCount((prev) => (prev === null ? null : prev + 1));
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Hapus komentar ini?")) return;
    await deleteComment(target, commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setTotalCount((prev) => (prev === null ? null : Math.max(0, prev - 1)));
  };

  return (
    <div className="mt-16 border-t border-black/10 pt-8">
      <h3 className="font-bold text-lg mb-6">
        Comments {totalCount !== null && totalCount > 0 && `(${totalCount})`}
      </h3>

      {!enabled ? (
        <div className="border border-black/10 bg-black/[0.03] p-5 mb-8">
          <p className="text-sm text-black/60">
            The author wants this to be a quiet read—comments are turned off.
          </p>
        </div>
      ) : user ? (
        <div className="flex gap-3 mb-8">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || "You"}
              className="w-9 h-9 rounded-full shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-black/10 shrink-0" />
          )}
          <div className="flex-1">
            <textarea
              id="comment-text"
              name="commentText"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tulis komentar..."
              rows={3}
              className="w-full border border-black/10 px-3 py-2 text-base"
            />
            <button
              onClick={handlePost}
              disabled={posting || !text.trim()}
              className="btn-primary mt-2 text-sm disabled:opacity-40"
            >
              {posting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-black/10 bg-white p-5 mb-8 flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-black/60">
            Sign in with Google to leave a comment.
          </p>
          <button onClick={loginWithGoogle} className="btn-outline text-sm">
            Sign in with Google
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-black/40">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-black/40">
          No comments yet. Be the first to comment!
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-5">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                {c.authorPhotoURL ? (
                  <img
                    src={c.authorPhotoURL}
                    alt={c.authorName}
                    className="w-9 h-9 rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-black/10 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.authorName}</span>
                    <span className="text-xs text-black/40">
                      {new Date(c.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-black/80 mt-1 whitespace-pre-wrap">
                    {c.text}
                  </p>
                </div>
                {(canModerate || user?.uid === c.authorUid) && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-black/30 hover:text-red-600 shrink-0"
                  >
                    <FiTrash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="btn-outline text-sm mt-6"
            >
              {loadingMore ? "Loading..." : "Load More Comments"}
            </button>
          )}
        </>
      )}
    </div>
  );
}