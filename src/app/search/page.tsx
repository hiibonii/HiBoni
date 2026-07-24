"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StoryCard from "@/components/StoryCard";
import { searchStories } from "@/lib/firestore";
import { getCategoriesCached } from "@/lib/categoriesStore";
import { getAuthorDisplayName } from "@/lib/authors";
import { StoryDoc, CategoryDoc } from "@/types";

function SearchInner() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState<StoryDoc[]>([]);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategoriesCached().then(setCategories);
  }, []);

  const categoryLabel = (story: StoryDoc) =>
    categories.find((c) => c.id === story.categoryId)?.label ||
    story.category ||
    "Uncategorized";

  useEffect(() => {
    setLoading(true);
    searchStories(q).then(async (r) => {
      setResults(r);
      setLoading(false);
      const uniqueIds = Array.from(
        new Set(r.map((s) => s.authorId).filter(Boolean) as string[])
      );
      if (uniqueIds.length > 0) {
        const entries = await Promise.all(
          uniqueIds.map(async (id) => [id, await getAuthorDisplayName(id)] as const)
        );
        setAuthorNames((prev) => ({
          ...prev,
          ...Object.fromEntries(entries.filter(([, name]) => name) as [string, string][]),
        }));
      }
    });
  }, [q]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-12 flex-1 w-full">
        <p className="text-xs uppercase tracking-widest text-black/50">
          Search Results
        </p>
        <h1 className="text-3xl md:text-4xl font-bold mb-8">"{q}"</h1>

        {loading ? (
          <p className="text-black/50">Searching...</p>
        ) : results.length === 0 ? (
          <p className="text-black/50">
            No stories found. Try a different keyword.
          </p>
        ) : (
          <>
            <p className="text-sm text-black/50 mb-6">
              Showing {results.length} stories found
            </p>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-14">
              {results.map((s, i) => (
                <StoryCard
                  key={s.id}
                  story={s}
                  priority={i === 0}
                  categoryLabel={categoryLabel(s)}
                  authorName={s.authorId ? authorNames[s.authorId] : undefined}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="p-12">Loading...</p>}>
      <SearchInner />
    </Suspense>
  );
}