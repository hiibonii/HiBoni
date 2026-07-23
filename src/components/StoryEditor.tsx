"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import CmsSidebar from "./CmsSidebar";
import CoverUploader from "./CoverUploader";
import ChapterManager from "./ChapterManager";
import { createStory, updateStory, makeSlug } from "@/lib/firestore";
import { StoryDoc, StoryType, StoryStatus, CategoryDoc } from "@/types";
import { getCategories } from "@/lib/categoriesStore";
import { useAuth } from "@/lib/useAuth";

const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="border border-black/10 bg-white min-h-[300px] p-4 text-black/40 text-sm">
      Loading editor...
    </div>
  ),
});

export default function StoryEditor({
  mode,
  initialData,
}: {
  mode: "create" | "edit";
  initialData?: StoryDoc;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [savedId, setSavedId] = useState<string | null>(
    mode === "edit" ? initialData?.id || null : null
  );
  const [type, setType] = useState<StoryType>(initialData?.type || "blog");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage || "");
  const [title, setTitle] = useState(initialData?.title || "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || "");
  const [tagsInput, setTagsInput] = useState(
    (initialData?.tags || []).join(", ")
  );
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [content, setContent] = useState<any>(initialData?.content || []);
  const [status, setStatus] = useState<StoryStatus>(initialData?.status || "draft");
  const [commentsEnabled, setCommentsEnabled] = useState(
    initialData?.commentsEnabled !== false
  );
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats);
      // Default to the first available category once loaded, if none set yet.
      if (!initialData?.categoryId && cats.length > 0) {
        setCategoryId((prev) => prev || cats[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const typeLocked = mode === "edit"; // can't change type after creation

  const parseTags = () =>
    Array.from(
      new Set(
        tagsInput
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      )
    );

  const buildPayload = (status: StoryStatus) => ({
    type,
    title,
    categoryId,
    // Legacy slug field — no longer used for filtering, kept only so old
    // data readers / the migration tool have something to fall back on.
    category: categories.find((c) => c.id === categoryId)?.value || "",
    tags: parseTags(),
    summary,
    coverImage,
    status,
    commentsEnabled,
    ...(type === "blog" ? { content } : {}),
  });

  const handleSave = async (newStatus: StoryStatus) => {
    if (!title.trim()) {
      alert("Judul wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      if (savedId) {
        await updateStory(savedId, buildPayload(newStatus));
        setStatus(newStatus);
        router.push("/dashboard?saved=1");
      } else {
        const id = await createStory({
          ...buildPayload(newStatus),
          authorId: user?.uid,
        });
        setSavedId(id);
        setStatus(newStatus);
        if (type === "story") {
          // Stay here (don't jump to dashboard yet) so chapters/parts can be
          // added right away — Chapter/Part management only appears once
          // the story has an id.
          router.replace(`/dashboard/edit/${id}`);
        } else {
          router.push("/dashboard?saved=1");
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!title.trim()) {
      alert("Judul wajib diisi sebelum preview.");
      return;
    }
    setPreviewing(true);
    try {
      // Persist current edits first (keeping whatever status it already
      // has — preview must never silently publish or unpublish a story),
      // so the preview tab reflects exactly what's in the editor now.
      if (savedId) {
        await updateStory(savedId, buildPayload(status));
      } else {
        const id = await createStory({
          ...buildPayload(status),
          authorId: user?.uid,
        });
        setSavedId(id);
        router.replace(`/dashboard/edit/${id}`);
      }
      window.open(`/story/${makeSlug(title)}`, "_blank");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="flex">
      <CmsSidebar />
      <main className="flex-1">
        <div className="flex items-center justify-between border-b border-black/10 p-4 bg-white">
          <h1 className="font-bold uppercase tracking-wide">
            {mode === "create" ? "Editor — New Story" : "Editor — Edit Story"}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handlePreview}
              disabled={previewing || saving}
              className="btn-outline"
            >
              {previewing ? "Preparing..." : "Preview"}
            </button>
            <button
              onClick={() => handleSave("draft")}
              disabled={saving || previewing}
              className="btn-outline"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave("published")}
              disabled={saving || previewing}
              className="btn-primary"
            >
              Publish
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto p-8">
          <div className="flex gap-4 mb-6">
            {(["blog", "story"] as StoryType[]).map((t) => (
              <button
                key={t}
                disabled={typeLocked}
                onClick={() => setType(t)}
                className={`px-4 py-2 text-sm border capitalize ${
                  type === t
                    ? "bg-ink text-white border-ink"
                    : "bg-white border-black/10"
                } ${typeLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {t === "blog" ? "Blog" : "Story (Chapters)"}
              </button>
            ))}
          </div>

          <p className="text-xs uppercase tracking-wide text-black/50 mb-2">
            Cover Image
          </p>
          <CoverUploader value={coverImage} onChange={setCoverImage} />

          <input
            id="story-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === "blog" ? "Post Title" : "Main Story Title"}
            className="w-full text-2xl font-bold border-b border-black/10 py-3 mt-6 bg-transparent outline-none"
          />

          <div className="mt-4">
            <label htmlFor="story-category" className="text-xs uppercase tracking-wide text-black/50">
              Category
            </label>
            <select
              id="story-category"
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-black/10 px-3 py-2 mt-1"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="story-tags" className="text-xs uppercase tracking-wide text-black/50">
              Tags
            </label>
            <input
              id="story-tags"
              name="tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g., minimalism, ui, editorial (separate with commas)"
              className="w-full border border-black/10 px-3 py-2 mt-1"
            />
            {parseTags().length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {parseTags().map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-black/5 border border-black/10 px-2 py-1"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 border border-black/10 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-black/50">
                Comments
              </p>
              <p className="text-sm text-black/60 mt-0.5">
                {commentsEnabled
                  ? "Comments are enabled for this story."
                  : "Comments are disabled for this story."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCommentsEnabled((v) => !v)}
              role="switch"
              aria-checked={commentsEnabled}
              className={`shrink-0 w-12 h-7 rounded-full relative transition-colors ${
                commentsEnabled ? "bg-ink" : "bg-black/20"
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
                  commentsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {type === "story" && (
            <div className="mt-4">
              <label htmlFor="story-summary" className="text-xs uppercase tracking-wide text-black/50">
                Story Summary
              </label>
              <textarea
                id="story-summary"
                name="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                placeholder="Brief summary of the story..."
                className="w-full border border-black/10 px-3 py-2 mt-1"
              />
            </div>
          )}

          {type === "blog" && (
            <div className="mt-6">
              <label className="text-xs uppercase tracking-wide text-black/50">
                Writing Area
              </label>
              <div className="mt-1">
                <Editor initialContent={content} onChange={setContent} />
              </div>
            </div>
          )}

          {type === "story" && !savedId && (
            <p className="mt-6 text-sm text-black/50 bg-paper border border-black/10 p-4">
              Save as a draft first to start adding chapters and parts.
            </p>
          )}

          {type === "story" && savedId && <ChapterManager storyId={savedId} />}
        </div>
      </main>
    </div>
  );
}