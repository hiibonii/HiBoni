"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CommentSection from "@/components/CommentSection";
import {
  getStoryBySlug,
  getChapters,
  getParts,
  incrementViews,
} from "@/lib/firestore";
import { StoryDoc, ChapterDoc, PartDoc } from "@/types";
import { notFound } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { getCategoryLabelMap } from "@/lib/categoriesStore";
import { getAuthorDisplayName } from "@/lib/authors";
import { isBookmarked, addBookmark, removeBookmark } from "@/lib/bookmarks";
import { BsBookmark, BsBookmarkFill } from "react-icons/bs";

// BlockNote pulls in Tiptap/Prosemirror (a large dependency tree). Loading it
// dynamically, client-side only, keeps it out of the main route bundle so
// other pages (and the very first compile) stay fast.
const ContentRenderer = dynamic(() => import("@/components/ContentRenderer"), {
  ssr: false,
  loading: () => <p className="text-black/40 text-sm">Loading content...</p>,
});

function DetailInner({ initialStory }: { initialStory?: StoryDoc | null }) {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const chapterIdx = parseInt(searchParams.get("chapter") || "0", 10);
  const partIdx = parseInt(searchParams.get("part") || "0", 10);

  const { user, loading: authLoading, loginWithGoogle, isSuperAdmin, isCreator } = useAuth();
  const [story, setStory] = useState<StoryDoc | null | undefined>(undefined);
  const [chapters, setChapters] = useState<ChapterDoc[]>([]);
  const [parts, setParts] = useState<PartDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string>>({});
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  useEffect(() => {
    getCategoryLabelMap().then(setCategoryLabels);
  }, []);

  useEffect(() => {
    if (story?.authorId) {
      getAuthorDisplayName(story.authorId).then(setAuthorName);
    }
  }, [story?.authorId]);

  useEffect(() => {
    if (user && story) {
      isBookmarked(user.uid, story.id).then(setBookmarked);
    } else {
      setBookmarked(false);
    }
  }, [user, story]);

  const handleToggleBookmark = async () => {
    if (!user || !story || bookmarkBusy) return;
    setBookmarkBusy(true);
    // Optimistic — flip the icon immediately, roll back only if the write
    // actually fails, so the button feels instant on a normal connection.
    const next = !bookmarked;
    setBookmarked(next);
    try {
      if (next) {
        await addBookmark(user.uid, story.id);
      } else {
        await removeBookmark(user.uid, story.id);
      }
    } catch {
      setBookmarked(!next);
    } finally {
      setBookmarkBusy(false);
    }
  };

  useEffect(() => {
    // Don't fetch yet if we don't know the auth state — a draft/preview
    // opened by the admin in a fresh tab would otherwise be looked up as
    // "not logged in" for a moment (before Firebase restores the session),
    // incorrectly triggering a 404 before the admin session is detected.
    if (authLoading) return;

    (async () => {
      // The server (page.tsx) already fetched this story once for SEO
      // metadata — reuse it instead of reading Firestore again for the
      // common case (a published article). We only fall back to a client
      // fetch when the server came up empty, which happens for drafts (the
      // server intentionally never fetches those) or genuine 404s — both
      // cases need the client's own auth-aware lookup anyway.
      const s = initialStory || (await getStoryBySlug(slug, !!user));
      setStory(s);
      if (s) {
        incrementViews(s.id).catch((err) =>
          console.warn("View counter tidak ter-update (cek Firestore rules):", err)
        );
        if (s.type === "story") {
          const ch = await getChapters(s.id);
          setChapters(ch);
          const isFirstChapter = chapterIdx === 0;
          if (ch[chapterIdx]) {
            if (!user && !isFirstChapter) {
              // Signed-out visitor requesting a chapter beyond the free
              // preview — don't even attempt the query, it would be
              // denied outright. Show the gate directly.
              setParts([]);
            } else {
              try {
                const p = await getParts(s.id, ch[chapterIdx].id, !user);
                setParts(p);
              } catch {
                setParts([]);
              }
            }
          }
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, chapterIdx, user, authLoading]);

  if (loading) return <p className="p-12">Loading...</p>;
  if (story === null) notFound();
  if (!story) return null;

  const currentPart = parts[partIdx];

  // Who may delete ANY comment here (not just their own): a super_admin
  // always, or a creator but only on a story they themselves own — mirrors
  // canManageStory() in firestore.rules exactly.
  const canModerateComments =
    isSuperAdmin || (isCreator && !!user && story.authorId === user.uid);

  // Free preview: an unauthenticated visitor can read the first 2 parts
  // (index 0 and 1) of the first chapter only — everything past that
  // requires signing in. This mirrors the firestore.rules enforcement
  // exactly; the rules are the real gate, this just drives the UI.
  const isFreePart = chapterIdx === 0 && partIdx < 2;
  const isGated = story.type === "story" && !user && !isFreePart;

  const goTo = (cIdx: number, pIdx: number) => {
    router.push(`/story/${slug}?chapter=${cIdx}&part=${pIdx}`);
  };

  const canPrev = story.type === "story" && (partIdx > 0 || chapterIdx > 0);
  const canNext =
    story.type === "story" &&
    (user
      ? partIdx < parts.length - 1 || chapterIdx < chapters.length - 1
      : true); // signed-out: always let them step forward into the gate — we deliberately don't reveal the real remaining length

  const handlePrev = () => {
    if (partIdx > 0) goTo(chapterIdx, partIdx - 1);
    else if (chapterIdx > 0) goTo(chapterIdx - 1, 0); // approximate: lands on first part of prev chapter
  };

  const handleNext = () => {
    if (!user) {
      // Signed-out visitors only ever see the free preview, so we
      // deliberately don't know (or reveal) the real chapter/part count
      // beyond it — just step forward within the same chapter. Real
      // cross-chapter navigation resumes once they sign in.
      goTo(chapterIdx, partIdx + 1);
      return;
    }
    if (partIdx < parts.length - 1) goTo(chapterIdx, partIdx + 1);
    else if (chapterIdx < chapters.length - 1) goTo(chapterIdx + 1, 0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="relative w-full h-[45vh] bg-black/10">
        {story.coverImage && (
          <Image
            src={story.coverImage}
            alt={story.title}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-8 md:p-16">
          <div className="flex items-start justify-between gap-4 mb-3">
            <span className="bg-black text-white text-xs uppercase tracking-wide px-3 py-1 w-fit">
              {(story.categoryId && categoryLabels[story.categoryId]) || story.category || "Uncategorized"}
            </span>
            {user && (
              <button
                onClick={handleToggleBookmark}
                disabled={bookmarkBusy}
                aria-label={bookmarked ? "Hapus dari bookmark" : "Simpan ke bookmark"}
                title={bookmarked ? "Hapus dari bookmark" : "Simpan ke bookmark"}
                className="text-white bg-black/40 hover:bg-black/60 rounded-full p-2.5 disabled:opacity-50 shrink-0"
              >
                {bookmarked ? <BsBookmarkFill size={18} /> : <BsBookmark size={18} />}
              </button>
            )}
          </div>
          <h1 className="text-white text-3xl md:text-5xl font-bold max-w-3xl">
            {story.title}
          </h1>
          {authorName && (
            <p className="text-white/70 text-sm mt-3">Written by {authorName}</p>
          )}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-12 flex-1 w-full">
        {story.type === "blog" ? (
          <>
            <ContentRenderer key={`content-${story.id}`} content={story.content} />

            {story.tags && story.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-black/10">
                {story.tags.map((t) => (
                  <a
                    key={t}
                    href={`/search?q=${encodeURIComponent(t)}`}
                    className="text-xs uppercase tracking-wide text-black/60 bg-black/5 hover:bg-black/10 px-3 py-1.5"
                  >
                    {t}
                  </a>
                ))}
              </div>
            )}

            <CommentSection
              key={`comments-${story.id}`}
              target={{ storyId: story.id }}
              commentsEnabled={story.commentsEnabled}
              canModerate={canModerateComments}
            />
          </>
        ) : (
          <>
            <p className="text-black/60 mb-8">{story.summary}</p>

            {chapters.length > 0 && (
              <p className="text-xs uppercase tracking-widest text-black/50 mb-4">
                {chapters[chapterIdx]?.title}
                {user && ` — Part ${partIdx + 1} of ${parts.length}`}
              </p>
            )}

            {isGated ? (
              <div className="border border-black/10 bg-black/[0.03] p-8 md:p-12 text-center">
                <h2 className="text-xl font-bold mb-2">Continue Reading</h2>
                <p className="text-black/60 mb-6 max-w-sm mx-auto">
                  You have read the free portion of this story. Sign in to
                  continue reading the rest for free.
                </p>
                <button onClick={loginWithGoogle} className="btn-primary">
                  Sign in with Google
                </button>
              </div>
            ) : currentPart ? (
              <>
                <h2 className="text-2xl font-bold mb-4">{currentPart.title}</h2>
                <ContentRenderer
                  key={`content-${currentPart.id}`}
                  content={currentPart.content}
                />
              </>
            ) : (
              <p className="text-black/50">This story has no parts yet.</p>
            )}

            {story.tags && story.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10 pt-8 border-t border-black/10">
                {story.tags.map((t) => (
                  <a
                    key={t}
                    href={`/search?q=${encodeURIComponent(t)}`}
                    className="text-xs uppercase tracking-wide text-black/60 bg-black/5 hover:bg-black/10 px-3 py-1.5"
                  >
                    {t}
                  </a>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-10">
              <button
                onClick={handlePrev}
                disabled={!canPrev}
                className="text-left border border-black/10 bg-white p-5 hover:border-black/30 transition-colors disabled:opacity-30 disabled:hover:border-black/10"
              >
                <span className="flex items-center gap-1 text-xs uppercase tracking-widest text-black/50 mb-1">
                  ← Previous Part
                </span>
                <span className="font-bold block truncate">
                  {partIdx > 0
                    ? parts[partIdx - 1]?.title || "Previous"
                    : chapterIdx > 0
                    ? chapters[chapterIdx - 1]?.title || "Previous"
                    : ""}
                </span>
              </button>
              <button
                onClick={handleNext}
                disabled={!canNext}
                className="text-right border border-black/10 bg-ink text-white p-5 hover:bg-black/80 transition-colors disabled:opacity-30 disabled:hover:bg-ink"
              >
                <span className="flex items-center justify-end gap-1 text-xs uppercase tracking-widest text-white/60 mb-1">
                  Next Part →
                </span>
                <span className="font-bold block truncate">
                  {!user
                    ? parts[partIdx + 1]?.title || "Continue Reading"
                    : partIdx < parts.length - 1
                    ? parts[partIdx + 1]?.title
                    : chapterIdx < chapters.length - 1
                    ? chapters[chapterIdx + 1]?.title
                    : ""}
                </span>
              </button>
            </div>

            {currentPart && (
              <CommentSection
                key={`comments-${currentPart.id}`}
                target={{
                  storyId: story.id,
                  chapterId: chapters[chapterIdx]?.id,
                  partId: currentPart.id,
                }}
                commentsEnabled={story.commentsEnabled}
                canModerate={canModerateComments}
              />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function DetailClient({
  initialStory,
}: {
  initialStory?: StoryDoc | null;
}) {
  return (
    <Suspense fallback={<p className="p-12">Loading...</p>}>
      <DetailInner initialStory={initialStory} />
    </Suspense>
  );
}