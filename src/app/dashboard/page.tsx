"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEye, FiEdit3, FiBook, FiTrash2, FiMessageCircle, FiCheckCircle, FiX } from "react-icons/fi";
import ProtectedRoute from "@/components/ProtectedRoute";
import CmsSidebar from "@/components/CmsSidebar";
import {
  getDashboardStoriesPage,
  getDashboardStoriesCount,
  getDashboardStats,
  deleteStory,
} from "@/lib/firestore";
import { getTotalCommentCount } from "@/lib/comments";
import { getAllUsers } from "@/lib/usersStore";
import { useAuth } from "@/lib/useAuth";
import { StoryDoc } from "@/types";

const PAGE_SIZE = 15;

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justSaved = searchParams.get("saved") === "1";
  const accessDenied = searchParams.get("denied") === "1";
  const { user, isSuperAdmin } = useAuth();

  // Table data (server-side filtered + paginated)
  const [stories, setStories] = useState<StoryDoc[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "blog" | "story">("all");
  const [cursors, setCursors] = useState<any[]>([null]);
  const [page, setPage] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);

  // Site-wide summary cards (independent of table filters/pagination)
  const [stats, setStats] = useState({
    totalViews: 0,
    totalStories: 0,
    draftCount: 0,
    storyTypeCount: 0,
  });
  const [commentCount, setCommentCount] = useState<number | null>(null);

  // Debounce the search box so we don't hit Firestore on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadPage = async (pageIndex: number, cursorList: any[]) => {
    setTableLoading(true);
    const { items, lastDoc } = await getDashboardStoriesPage({
      type: typeFilter,
      searchTerm: debouncedSearch,
      authorId: isSuperAdmin ? undefined : user?.uid,
      pageSize: PAGE_SIZE,
      cursor: cursorList[pageIndex],
    });
    setStories(items);
    if (lastDoc && cursorList.length === pageIndex + 1) {
      setCursors([...cursorList, lastDoc]);
    }
    setTableLoading(false);
  };

  // Super admin sees an "Author" column across everyone's stories. Fetched
  // once (not per-page) from the private users collection — which only a
  // super_admin can read — rather than the public authorProfiles mirror,
  // since that mirror can still be blank for anyone who hasn't re-saved
  // their profile since the sync bug was fixed.
  useEffect(() => {
    if (!isSuperAdmin) return;
    getAllUsers().then((users) => {
      setAuthorNames(
        Object.fromEntries(
          users.map((u) => [u.uid, u.displayName || u.email || "Unknown"])
        )
      );
    });
  }, [isSuperAdmin]);

  // Whenever the filters change (or the signed-in user/role settles): reset
  // to page 1 and re-fetch both the page and the matching-count.
  useEffect(() => {
    if (!user) return;
    setPage(0);
    setCursors([null]);
    loadPage(0, [null]);
    getDashboardStoriesCount({
      type: typeFilter,
      searchTerm: debouncedSearch,
      authorId: isSuperAdmin ? undefined : user.uid,
    }).then(setFilteredCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, debouncedSearch, user, isSuperAdmin]);

  const loadSummary = async () => {
    if (!user) return;
    const [statsData, count] = await Promise.all([
      getDashboardStats(isSuperAdmin ? undefined : user.uid),
      getTotalCommentCount(),
    ]);
    setStats(statsData);
    setCommentCount(count);
  };

  useEffect(() => {
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSuperAdmin]);

  const goNext = () => {
    const next = page + 1;
    setPage(next);
    loadPage(next, cursors);
  };
  const goPrev = () => {
    const prev = Math.max(0, page - 1);
    setPage(prev);
    loadPage(prev, cursors);
  };

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const hasMore = stories.length === PAGE_SIZE;

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus cerita ini secara permanen?")) return;
    await deleteStory(id);
    loadPage(page, cursors);
    loadSummary();
  };

  return (
    <ProtectedRoute>
      <div className="flex">
        <CmsSidebar />
        <main className="flex-1 p-8">
          {accessDenied && (
            <div className="flex items-center justify-between gap-3 bg-red-600 text-white px-4 py-3 mb-6 text-sm">
              <span className="flex items-center gap-2">
                <FiX /> Oops! That’s Dinosaurs territory."
              </span>
              <button onClick={() => router.replace("/dashboard")} aria-label="Tutup">
                <FiX />
              </button>
            </div>
          )}
          {justSaved && (
            <div className="flex items-center justify-between gap-3 bg-black text-white px-4 py-3 mb-6 text-sm">
              <span className="flex items-center gap-2">
                <FiCheckCircle /> Got it! Your changes are saved.
              </span>
              <button onClick={() => router.replace("/dashboard")} aria-label="Tutup">
                <FiX />
              </button>
            </div>
          )}
          <h1 className="text-3xl font-bold mb-1">Workspace Overview</h1>
          <p className="text-black/60 mb-8">
            See how well your posts are performing and take control of your content!
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="border border-black/10 bg-white p-6">
              <div className="flex justify-between items-center mb-2 text-xs uppercase tracking-wide text-black/50">
                Total Views <FiEye />
              </div>
              <p className="text-3xl font-bold">{stats.totalViews.toLocaleString()}</p>
            </div>
            <div className="border border-black/10 bg-white p-6">
              <div className="flex justify-between items-center mb-2 text-xs uppercase tracking-wide text-black/50">
                Total Stories <FiEdit3 />
              </div>
              <p className="text-3xl font-bold">{stats.totalStories}</p>
              <p className="text-xs text-black/50">{stats.draftCount} in draft mode</p>
            </div>
            <div className="border border-black/10 bg-white p-6">
              <div className="flex justify-between items-center mb-2 text-xs uppercase tracking-wide text-black/50">
                Story Type <FiBook />
              </div>
              <p className="text-3xl font-bold">{stats.storyTypeCount}</p>
              <p className="text-xs text-black/50">multi-chapter stories</p>
            </div>
            <div className="border border-black/10 bg-white p-6">
              <div className="flex justify-between items-center mb-2 text-xs uppercase tracking-wide text-black/50">
                Total Comments <FiMessageCircle />
              </div>
              <p className="text-3xl font-bold">
                {commentCount === null ? "—" : commentCount.toLocaleString()}
              </p>
              <p className="text-xs text-black/50">across all blogs &amp; parts</p>
            </div>
          </div>

          <div className="bg-white border border-black/10">
            <div className="flex items-center justify-between p-4 border-b border-black/10 flex-wrap gap-3">
              <h2 className="font-bold">All Stories</h2>
              <Link href="/dashboard/create" className="btn-primary text-sm">
                + New
              </Link>
            </div>

            <div className="flex items-center gap-3 p-4 border-b border-black/10 flex-wrap">
              <input
                id="dashboard-story-search"
                name="storySearch"
                type="search"
                autoComplete="off"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title (starts with)..."
                className="flex-1 min-w-[200px] border border-black/10 px-3 py-2 text-sm"
              />
              <select
                id="dashboard-type-filter"
                name="typeFilter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="border border-black/10 px-3 py-2 text-sm"
              >
                <option value="all">All Types</option>
                <option value="blog">Blog</option>
                <option value="story">Story</option>
              </select>
            </div>

            {tableLoading ? (
              <p className="p-6 text-black/50">Loading...</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-paper text-left text-xs uppercase text-black/50">
                  <tr>
                    <th className="p-4">Title</th>
                    {isSuperAdmin && <th className="p-4">Author</th>}
                    <th className="p-4">Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Views</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stories.map((s) => (
                    <tr key={s.id} className="border-t border-black/5">
                      <td className="p-4 font-medium">
                        <a
                          href={`/story/${s.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          title="Open reading page in a new tab"
                        >
                          {s.title}
                        </a>
                      </td>
                      {isSuperAdmin && (
                        <td className="p-4 text-black/60">
                          {s.authorId ? authorNames[s.authorId] || "…" : "—"}
                        </td>
                      )}
                      <td className="p-4 capitalize">{s.type}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 text-xs uppercase ${
                            s.status === "published"
                              ? "bg-black text-white"
                              : "bg-black/10"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4">{s.views}</td>
                      <td className="p-4 flex gap-2">
                        <Link
                          href={`/dashboard/edit/${s.id}`}
                          className="w-8 h-8 border border-black/10 flex items-center justify-center hover:bg-black hover:text-white"
                        >
                          <FiEdit3 size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="w-8 h-8 border border-black/10 flex items-center justify-center hover:bg-red-600 hover:text-white"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {stories.length === 0 && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 6 : 5} className="p-6 text-center text-black/50">
                        {filteredCount === 0
                          ? "No stories match your search/filter."
                          : "No stories yet. Create your first one!"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {!tableLoading && filteredCount > 0 && (
              <div className="flex items-center justify-between p-4 border-t border-black/10 text-sm">
                <span className="text-black/50">
                  Page {page + 1} of {totalPages} · {filteredCount} total
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={goPrev}
                    disabled={page === 0}
                    className="disabled:opacity-30 font-medium"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={goNext}
                    disabled={!hasMore}
                    className="disabled:opacity-30 font-medium"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="p-12">Loading...</p>}>
      <DashboardInner />
    </Suspense>
  );
}