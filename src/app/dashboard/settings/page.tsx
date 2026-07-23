"use client";

import { useEffect, useState } from "react";
import { FiEdit3, FiTrash2, FiPlus, FiCheck, FiX, FiRefreshCw } from "react-icons/fi";
import ProtectedRoute from "@/components/ProtectedRoute";
import CmsSidebar from "@/components/CmsSidebar";
import {
  seedDefaultCategoriesIfEmpty,
  addCategory,
  updateCategory,
  deleteCategory,
} from "@/lib/categoriesStore";
import { syncStoriesToCategoryIds, syncStoriesToAuthorId } from "@/lib/firestore";
import { useAuth } from "@/lib/useAuth";
import { CategoryDoc } from "@/types";

function SettingsInner() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [authorSyncing, setAuthorSyncing] = useState(false);
  const [authorSyncResult, setAuthorSyncResult] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const data = await seedDefaultCategoriesIfEmpty();
    setCategories(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    try {
      await addCategory(newLabel.trim(), categories.length);
      setNewLabel("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: CategoryDoc) => {
    setEditingId(c.id);
    setEditLabel(c.label);
  };

  const saveEdit = async (id: string) => {
    if (!editLabel.trim()) return;
    await updateCategory(id, editLabel.trim());
    setEditingId(null);
    load();
  };

  const handleDelete = async (c: CategoryDoc) => {
    if (
      !confirm(
        `Hapus kategori "${c.label}"? Cerita lama yang masih pakai kategori ini tidak akan terhapus, tapi tidak akan muncul lagi di filter kategori.`
      )
    )
      return;
    await deleteCategory(c.id);
    load();
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncStoriesToCategoryIds(categories);
      setSyncResult(
        result.updated > 0
          ? `${result.updated} stories successfully synced.` +
              (result.skippedNoMatch > 0
                ? ` ${result.skippedNoMatch} story skipped (its old category was deleted—please reselect a category manually in the editor).`
                : "")
          : "All stories synced. No changes needed."
      );
    } catch (err) {
      setSyncResult("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleAuthorSync = async () => {
    if (!user) return;
    setAuthorSyncing(true);
    setAuthorSyncResult(null);
    try {
      const result = await syncStoriesToAuthorId(user.uid);
      setAuthorSyncResult(
        result.updated > 0
          ? `${result.updated} old stories successfully marked as yours.` +
              (result.failed > 0
                ? ` ${result.failed} failed to sync — click Sync Now again to try again.`
                : "")
          : result.failed > 0
          ? `${result.failed} stories failed to sync — click Sync Now again to try again.`
          : "All stories synced. No changes needed."
      );
    } catch (err) {
      setAuthorSyncResult("Sync failed. Please try again.");
    } finally {
      setAuthorSyncing(false);
    }
  };

  return (
    <ProtectedRoute requireSuperAdmin>
      <div className="flex">
        <CmsSidebar />
        <main className="flex-1 p-8 max-w-2xl">
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-black/60 mb-8">
            Manage categories that appear in the Home filter and Create/Edit Story form.
          </p>

          <div className="bg-white border border-black/10">
            <div className="p-4 border-b border-black/10">
              <h2 className="font-bold">Categories</h2>
            </div>

            {loading ? (
              <p className="p-6 text-black/50">Loading...</p>
            ) : (
              <div className="divide-y divide-black/5">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    {editingId === c.id ? (
                      <>
                        <input
                          name={`category-edit-${c.id}`}
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="flex-1 border border-black/10 px-2 py-1 text-sm mr-2"
                          autoFocus
                        />
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => saveEdit(c.id)}
                            className="w-8 h-8 border border-black/10 flex items-center justify-center hover:bg-black hover:text-white"
                          >
                            <FiCheck size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="w-8 h-8 border border-black/10 flex items-center justify-center hover:bg-black/5"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm font-medium">{c.label}</p>
                          <p className="text-xs text-black/40">{c.value}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => startEdit(c)}
                            className="w-8 h-8 border border-black/10 flex items-center justify-center hover:bg-black hover:text-white"
                          >
                            <FiEdit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="w-8 h-8 border border-black/10 flex items-center justify-center hover:bg-red-600 hover:text-white"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="p-6 text-center text-black/50 text-sm">
                    No categories available.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 p-4 border-t border-black/10">
              <input
                id="new-category-label"
                name="newCategoryLabel"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="New category name..."
                className="flex-1 border border-black/10 px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
              <button
                onClick={handleAdd}
                disabled={saving || !newLabel.trim()}
                className="btn-primary text-sm flex items-center gap-1 disabled:opacity-40"
              >
                <FiPlus /> Add
              </button>
            </div>
          </div>

          <div className="bg-white border border-black/10 mt-6">
            <div className="p-4 border-b border-black/10">
              <h2 className="font-bold">Sync Categories</h2>
              <p className="text-sm text-black/60 mt-1">
                Old stories created before this update still use
                references to the old category versions. Click this button once to
                synchronize all of them with the currently active categories — it's safe
                to run multiple times.
              </p>
            </div>
            <div className="p-4">
              <button
                onClick={handleSync}
                disabled={syncing || loading}
                className="btn-outline text-sm flex items-center gap-2 disabled:opacity-40"
              >
                <FiRefreshCw className={syncing ? "animate-spin" : ""} size={14} />
                {syncing ? "Syncing..." : "Sync Now"}
              </button>
              {syncResult && (
                <p className="text-sm text-black/60 mt-3">{syncResult}</p>
              )}
            </div>
          </div>
          <div className="bg-white border border-black/10 mt-6">
            <div className="p-4 border-b border-black/10">
              <h2 className="font-bold">Sync Authors</h2>
              <p className="text-sm text-black/60 mt-1">
                Old stories created before the role/author feature was added
                don't have a listed author. Click this button once to mark
                all stories without an author as belonging to your account (you are
                the only author before this feature was added) — it's safe
                to run multiple times.
              </p>
            </div>
            <div className="p-4">
              <button
                onClick={handleAuthorSync}
                disabled={authorSyncing || loading}
                className="btn-outline text-sm flex items-center gap-2 disabled:opacity-40"
              >
                <FiRefreshCw className={authorSyncing ? "animate-spin" : ""} size={14} />
                {authorSyncing ? "Syncing..." : "Sync Now"}
              </button>
              {authorSyncResult && (
                <p className="text-sm text-black/60 mt-3">{authorSyncResult}</p>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function SettingsPage() {
  return <SettingsInner />;
}