"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import StoryCard from "@/components/StoryCard";
import {
  getPublishedStories,
  getPublishedStoriesCount,
  getFeaturedStories,
  getDiscoverStories,
} from "@/lib/firestore";
import { getCategoriesCached } from "@/lib/categoriesStore";
import { getAuthorDisplayName } from "@/lib/authors";
import { StoryDoc, CategoryDoc } from "@/types";

const PAGE_SIZE = 6;

type SortMode = "discover" | "latest" | "trending";

// Fisher-Yates — used once per Discover fetch so the shuffle is uniform,
// not just "sort by a random comparator" (which is biased in most engines).
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function HomeInner() {
  const searchParams = useSearchParams();
  const sort: SortMode = (searchParams.get("sort") as SortMode) || "discover";

  const [stories, setStories] = useState<StoryDoc[]>([]);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [category, setCategory] = useState("all"); // holds a category id, or "all"
  const [loading, setLoading] = useState(true);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});

  // Cursor-based state — only used for sort="latest"/"trending", where
  // Firestore does the ordering/pagination server-side.
  const [cursors, setCursors] = useState<any[]>([null]);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // In-memory state — only used for sort="discover". Firestore has no
  // native random ordering, so a capped batch is fetched once, shuffled
  // client-side, and paginated by simple array slicing from then on (no
  // further Firestore reads needed until the category filter changes).
  const [discoverPool, setDiscoverPool] = useState<StoryDoc[]>([]);
  const [discoverPage, setDiscoverPage] = useState(0);

  useEffect(() => {
    getCategoriesCached().then(setCategories);
  }, []);

  // Story docs store the category's immutable `id` (categoryId); resolve it
  // to the human-readable `label` shown in Settings. Falls back to the
  // legacy slug (for stories not yet backfilled — see Settings > Sync
  // Categories) and finally to a generic label, so nothing ever crashes or
  // shows a raw Firestore id.
  const categoryLabel = (story: StoryDoc) =>
    categories.find((c) => c.id === story.categoryId)?.label ||
    story.category ||
    "Uncategorized";

  const resolveAuthorNames = async (items: StoryDoc[]) => {
    const uniqueIds = Array.from(
      new Set(items.map((s) => s.authorId).filter(Boolean) as string[])
    );
    if (uniqueIds.length === 0) return;
    const entries = await Promise.all(
      uniqueIds.map(async (id) => [id, await getAuthorDisplayName(id)] as const)
    );
    setAuthorNames((prev) => ({
      ...prev,
      ...Object.fromEntries(entries.filter(([, name]) => name) as [string, string][]),
    }));
  };

  // ── sort="latest" / "trending" — Firestore cursor pagination ───────
  const load = async (pageIndex: number, cat: string, cursorList: any[]) => {
    setLoading(true);
    const { items, lastDoc } = await getPublishedStories({
      categoryId: cat,
      sort: sort === "trending" ? "trending" : "latest",
      pageSize: PAGE_SIZE,
      cursor: cursorList[pageIndex],
    });

    let finalItems = items;
    if (pageIndex === 0) {
      // Pin "Featured"-tagged stories at the very top of the first page.
      const featured = await getFeaturedStories(cat);
      const featuredIds = new Set(featured.map((f) => f.id));
      const rest = items.filter((s) => !featuredIds.has(s.id));
      finalItems = [...featured, ...rest].slice(0, PAGE_SIZE);
    }

    setStories(finalItems);
    setHasMore(items.length === PAGE_SIZE);
    if (lastDoc && cursorList.length === pageIndex + 1) {
      setCursors([...cursorList, lastDoc]);
    }
    setLoading(false);
    resolveAuthorNames(finalItems);
  };

  const goToPage = async (targetIndex: number) => {
    if (targetIndex === page) return;
    setLoading(true);
    let currentCursors = cursors;
    while (currentCursors.length <= targetIndex) {
      const { lastDoc } = await getPublishedStories({
        categoryId: category,
        sort: sort === "trending" ? "trending" : "latest",
        pageSize: PAGE_SIZE,
        cursor: currentCursors[currentCursors.length - 1],
      });
      if (!lastDoc) break;
      currentCursors = [...currentCursors, lastDoc];
    }
    setCursors(currentCursors);
    setPage(targetIndex);
    await load(targetIndex, category, currentCursors);
  };

  // ── sort="discover" — fetch once, shuffle, paginate in memory ──────
  const loadDiscover = async (cat: string) => {
    setLoading(true);
    const pool = shuffle(await getDiscoverStories(cat));
    setDiscoverPool(pool);
    setDiscoverPage(0);
    setLoading(false);
    resolveAuthorNames(pool.slice(0, PAGE_SIZE));
  };

  useEffect(() => {
    if (sort === "discover") {
      loadDiscover(category);
    } else {
      setPage(0);
      setCursors([null]);
      load(0, category, [null]);
      getPublishedStoriesCount(category).then(setTotalCount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort]);

  useEffect(() => {
    if (sort === "discover") {
      resolveAuthorNames(
        discoverPool.slice(discoverPage * PAGE_SIZE, (discoverPage + 1) * PAGE_SIZE)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoverPage]);

  const visibleStories =
    sort === "discover"
      ? discoverPool.slice(discoverPage * PAGE_SIZE, (discoverPage + 1) * PAGE_SIZE)
      : stories;

  const discoverTotalPages = Math.max(1, Math.ceil(discoverPool.length / PAGE_SIZE));
  const totalPages =
    sort === "discover" ? discoverTotalPages : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = sort === "discover" ? discoverPage : page;
  const canGoNext =
    sort === "discover" ? discoverPage < discoverTotalPages - 1 : hasMore;

  const goNext = () => {
    if (sort === "discover") {
      if (canGoNext) setDiscoverPage((p) => p + 1);
    } else if (hasMore) {
      goToPage(page + 1);
    }
  };
  const goPrev = () => {
    if (sort === "discover") {
      if (discoverPage > 0) setDiscoverPage((p) => p - 1);
    } else if (page > 0) {
      goToPage(page - 1);
    }
  };
  const goToPageNumber = (p: number) => {
    if (sort === "discover") {
      setDiscoverPage(p);
    } else {
      goToPage(p);
    }
  };

  // Builds a "1 2 3 ... N" style page list with an ellipsis, always keeping
  // the first page, the last page, and a small window around the current one.
  const getPageNumbers = () => {
    const current = currentPage + 1;
    const total = totalPages;
    const pages: (number | "...")[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) pages.push("...");
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push("...");
    if (total > 1) pages.push(total);
    return pages;
  };

  const headline =
    sort === "trending" ? "Trending Now" : sort === "latest" ? "Latest Stories" : null;

  return (
    <div>
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-12">
        {headline ? (
          <h1 className="text-4xl md:text-5xl font-bold mb-8">{headline}</h1>
        ) : (
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            The Written Word,
            <br />
            Refined.
          </h1>
        )}

        <p className="text-xs uppercase tracking-widest mb-2 text-black/50">
          Explore Topics
        </p>
        <div className="flex flex-wrap gap-2 mb-10">
          <button
            onClick={() => setCategory("all")}
            className={`px-4 py-2 text-xs uppercase tracking-wide border ${
              category === "all"
                ? "bg-ink text-white border-ink"
                : "bg-white border-black/10 hover:border-black/30"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`px-4 py-2 text-xs uppercase tracking-wide border ${
                category === c.id
                  ? "bg-ink text-white border-ink"
                  : "bg-white border-black/10 hover:border-black/30"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-black/50">Loading stories...</p>
        ) : visibleStories.length === 0 ? (
          <p className="text-black/50">No stories yet in this category.</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-x-8 gap-y-14">
            {visibleStories.map((s, i) => (
              <div
                key={s.id}
                className="story-card-enter"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <StoryCard
                  story={s}
                  priority={i === 0}
                  categoryLabel={categoryLabel(s)}
                  authorName={s.authorId ? authorNames[s.authorId] : undefined}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-12 border-t border-black/10 pt-6">
          <button
            onClick={goPrev}
            disabled={currentPage === 0}
            className="flex items-center gap-2 text-sm font-medium disabled:opacity-30"
          >
            ← Previous
          </button>
          <div className="flex items-center gap-4">
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="text-sm text-black/40">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPageNumber(p - 1)}
                  className={`text-sm ${
                    currentPage === p - 1
                      ? "font-bold underline underline-offset-4"
                      : "text-black/50 hover:text-black"
                  }`}
                >
                  {String(p).padStart(2, "0")}
                </button>
              )
            )}
          </div>
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="flex items-center gap-2 text-sm font-medium disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}