"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { FiPlus, FiEdit3, FiTrash2, FiChevronDown, FiChevronRight } from "react-icons/fi";
import {
  createChapter,
  deleteChapter,
  getChapters,
  updateChapter,
  createPart,
  deletePart,
  getParts,
  updatePart,
} from "@/lib/firestore";
import { ChapterDoc, PartDoc } from "@/types";

const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div className="border border-black/10 bg-white min-h-[200px] p-4 text-black/40 text-sm">
      Loading editor...
    </div>
  ),
});

export default function ChapterManager({ storyId }: { storyId: string }) {
  const [chapters, setChapters] = useState<ChapterDoc[]>([]);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [openChapter, setOpenChapter] = useState<string | null>(null);
  const [parts, setParts] = useState<Record<string, PartDoc[]>>({});
  const [partForm, setPartForm] = useState<Record<string, { title: string; content: any }>>({});
  const [editingPart, setEditingPart] = useState<string | null>(null);

  const loadChapters = async () => {
    const ch = await getChapters(storyId);
    setChapters(ch);
  };

  useEffect(() => {
    loadChapters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId]);

  const loadParts = async (chapterId: string) => {
    const p = await getParts(storyId, chapterId);
    setParts((prev) => ({ ...prev, [chapterId]: p }));
  };

  const toggleChapter = async (chapterId: string) => {
    if (openChapter === chapterId) {
      setOpenChapter(null);
      return;
    }
    setOpenChapter(chapterId);
    if (!parts[chapterId]) await loadParts(chapterId);
  };

  const addChapter = async () => {
    if (!newChapterTitle.trim()) return;
    await createChapter(storyId, newChapterTitle.trim(), chapters.length);
    setNewChapterTitle("");
    loadChapters();
  };

  const removeChapter = async (chapterId: string) => {
    if (!confirm("Hapus chapter ini beserta semua part-nya?")) return;
    await deleteChapter(storyId, chapterId);
    loadChapters();
  };

  const addPart = async (chapterId: string) => {
    const form = partForm[chapterId];
    if (!form?.title?.trim()) return;
    const order = (parts[chapterId]?.length || 0);
    await createPart(storyId, chapterId, form.title.trim(), form.content || [], order);
    setPartForm((prev) => ({ ...prev, [chapterId]: { title: "", content: [] } }));
    loadParts(chapterId);
  };

  const removePart = async (chapterId: string, partId: string) => {
    if (!confirm("Hapus part ini?")) return;
    await deletePart(storyId, chapterId, partId);
    loadParts(chapterId);
  };

  const saveEditedPart = async (chapterId: string, part: PartDoc, newContent: any, newTitle: string) => {
    await updatePart(storyId, chapterId, part.id, { title: newTitle, content: newContent });
    setEditingPart(null);
    loadParts(chapterId);
  };

  return (
    <div className="border border-black/10 bg-white p-6 mt-6">
      <h3 className="font-bold text-lg mb-4">Chapters &amp; Parts</h3>

      <div className="flex gap-2 mb-6">
        <input
          id="new-chapter-title"
          name="newChapterTitle"
          value={newChapterTitle}
          onChange={(e) => setNewChapterTitle(e.target.value)}
          placeholder="New chapter title..."
          className="flex-1 border border-black/10 px-3 py-2"
        />
        <button onClick={addChapter} className="btn-primary flex items-center gap-1">
          <FiPlus /> Add Chapter
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {chapters.map((ch) => (
          <div key={ch.id} className="border border-black/10">
            <div className="flex items-center justify-between p-3 bg-paper">
              <button
                onClick={() => toggleChapter(ch.id)}
                className="flex items-center gap-2 font-medium"
              >
                {openChapter === ch.id ? <FiChevronDown /> : <FiChevronRight />}
                {ch.title}
              </button>
              <button onClick={() => removeChapter(ch.id)}>
                <FiTrash2 className="text-black/40 hover:text-red-600" />
              </button>
            </div>

            {openChapter === ch.id && (
              <div className="p-4">
                {(parts[ch.id] || []).map((p) => (
                  <div key={p.id} className="border-b border-black/5 py-3">
                    {editingPart === p.id ? (
                      <PartEditForm
                        part={p}
                        onSave={(title, content) =>
                          saveEditedPart(ch.id, p, content, title)
                        }
                        onCancel={() => setEditingPart(null)}
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <span>{p.title}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingPart(p.id)}>
                            <FiEdit3 className="text-black/40 hover:text-black" />
                          </button>
                          <button onClick={() => removePart(ch.id, p.id)}>
                            <FiTrash2 className="text-black/40 hover:text-red-600" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-black/50 mb-2">
                    New Part
                  </p>
                  <input
                    id={`new-part-title-${ch.id}`}
                    name={`new-part-title-${ch.id}`}
                    value={partForm[ch.id]?.title || ""}
                    onChange={(e) =>
                      setPartForm((prev) => ({
                        ...prev,
                        [ch.id]: { ...prev[ch.id], title: e.target.value },
                      }))
                    }
                    placeholder="Part title..."
                    className="w-full border border-black/10 px-3 py-2 mb-2"
                  />
                  <Editor
                    key={`new-part-${ch.id}-${(parts[ch.id] || []).length}`}
                    onChange={(blocks) =>
                      setPartForm((prev) => ({
                        ...prev,
                        [ch.id]: { title: prev[ch.id]?.title || "", content: blocks },
                      }))
                    }
                  />
                  <button
                    onClick={() => addPart(ch.id)}
                    className="btn-outline mt-2"
                  >
                    + Add Part
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {chapters.length === 0 && (
          <p className="text-black/50 text-sm">No chapters yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}

function PartEditForm({
  part,
  onSave,
  onCancel,
}: {
  part: PartDoc;
  onSave: (title: string, content: any) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(part.title);
  const [content, setContent] = useState(part.content);

  return (
    <div>
      <input
        id={`edit-part-title-${part.id}`}
        name={`edit-part-title-${part.id}`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border border-black/10 px-3 py-2 mb-2"
      />
      <Editor initialContent={part.content} onChange={setContent} />
      <div className="flex gap-2 mt-2">
        <button onClick={() => onSave(title, content)} className="btn-primary">
          Save Part
        </button>
        <button onClick={onCancel} className="btn-outline">
          Cancel
        </button>
      </div>
    </div>
  );
}
