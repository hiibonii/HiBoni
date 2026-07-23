"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import CmsSidebar from "@/components/CmsSidebar";
import StoryCard from "@/components/StoryCard";
import { useAuth } from "@/lib/useAuth";
import { updateOwnProfile } from "@/lib/usersStore";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { getBookmarkedStories } from "@/lib/bookmarks";
import { getCategoriesCached } from "@/lib/categoriesStore";
import { getAuthorDisplayName } from "@/lib/authors";
import { StoryDoc, CategoryDoc } from "@/types";

function ProfileInner() {
  const { user, profile } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Seed the form from the live profile once it's loaded — using an effect
  // (not a default state initializer) because `profile` arrives async from
  // Firestore, slightly after this component first mounts.
  useEffect(() => {
    setDisplayName(profile.displayName || "");
    setPhotoURL(profile.photoURL || "");
  }, [profile.displayName, profile.photoURL]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadToCloudinary(file);
      setPhotoURL(url);
    } catch (err: any) {
      setError(err?.message || "Upload foto gagal.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!displayName.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateOwnProfile(user.uid, {
        displayName: displayName.trim(),
        photoURL,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Gagal menyimpan profil. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  // ── Bookmarks ────────────────────────────────────────────────────
  const [bookmarks, setBookmarks] = useState<StoryDoc[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    getBookmarkedStories(user.uid).then(async (stories) => {
      setBookmarks(stories);
      setBookmarksLoading(false);
      const uniqueIds = Array.from(
        new Set(stories.map((s) => s.authorId).filter(Boolean) as string[])
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
    getCategoriesCached().then(setCategories);
  }, [user]);

  const categoryLabel = (story: StoryDoc) =>
    categories.find((c) => c.id === story.categoryId)?.label ||
    story.category ||
    "Uncategorized";

  return (
    <div className="flex">
      <CmsSidebar />
      <main className="flex-1 p-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-1">My Profile</h1>
        <p className="text-black/60 mb-8">
          Update how you appear on your story byline.
        </p>

        <div className="bg-white border border-black/10 p-6 mb-10">
          <div className="flex items-center gap-4 mb-6">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt={displayName || "Profile"}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-black/10" />
            )}
            <div>
              <label htmlFor="profile-photo" className="btn-outline text-sm cursor-pointer inline-block">
                {uploading ? "Uploading..." : "Change Photo"}
                <input
                  id="profile-photo"
                  name="photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-black/40 mt-2">JPG, PNG, WEBP, or GIF. Max 10MB.</p>
            </div>
          </div>

          <label htmlFor="profile-display-name" className="text-xs uppercase tracking-wide font-medium">
            Display Name
          </label>
          <input
            id="profile-display-name"
            name="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Nama kamu"
            className="w-full border border-black/10 px-3 py-2 mt-2 mb-1"
          />
          <p className="text-xs text-black/40 mb-4">
            This is the name that will appear as the author on your stories.
          </p>

          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="btn-primary text-sm disabled:opacity-40"
          >
            {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
          </button>
        </div>

        <h2 className="text-xl font-bold mb-1">Bookmarked Stories</h2>
        <p className="text-black/60 mb-6">Stories you've saved to read later.</p>

        {bookmarksLoading ? (
          <p className="text-black/50">Loading...</p>
        ) : bookmarks.length === 0 ? (
          <p className="text-black/50">
            No stories bookmarked yet. Click the bookmark icon on any story page to
            save it here.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
            {bookmarks.map((s) => (
              <StoryCard
                key={s.id}
                story={s}
                categoryLabel={categoryLabel(s)}
                authorName={s.authorId ? authorNames[s.authorId] : undefined}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileInner />
    </ProtectedRoute>
  );
}