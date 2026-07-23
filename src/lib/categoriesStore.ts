import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { CategoryDoc } from "@/types";
import { DEFAULT_CATEGORIES } from "./categories";

const categoriesCol = collection(db, "categories");

function makeValue(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

export async function getCategories(): Promise<CategoryDoc[]> {
  const snap = await getDocs(query(categoriesCol, orderBy("order", "asc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CategoryDoc));
}

// Simple in-memory cache so Home / Search / Story detail don't each fire
// their own Firestore read for the same category list on every mount.
// Lives for the tab's lifetime and is cleared automatically any time an
// admin adds/edits/deletes a category from Settings (see invalidate calls
// below), so it can never go stale while the app is open.
let categoriesCache: Promise<CategoryDoc[]> | null = null;

export function getCategoriesCached(): Promise<CategoryDoc[]> {
  if (!categoriesCache) {
    categoriesCache = getCategories();
  }
  return categoriesCache;
}

function invalidateCategoriesCache() {
  categoriesCache = null;
}

// Public-facing pages store the category's `id` on each story (see
// StoryDoc.categoryId), not its human-friendly `label`. This builds an
// id -> label lookup so display code never has to print a raw id or a
// stale slug.
export async function getCategoryLabelMap(): Promise<Record<string, string>> {
  const cats = await getCategoriesCached();
  return Object.fromEntries(cats.map((c) => [c.id, c.label]));
}

// Seeds the default category list into Firestore, but only if the
// collection is still empty. Writing requires admin permissions, so this
// must only ever be called from an admin-only screen (Settings page) —
// never from public pages like Home, which anonymous visitors can load.
export async function seedDefaultCategoriesIfEmpty() {
  const existing = await getCategories();
  if (existing.length > 0) return existing;

  const batch = writeBatch(db);
  DEFAULT_CATEGORIES.forEach((c, i) => {
    const ref = doc(categoriesCol);
    batch.set(ref, { value: c.value, label: c.label, order: i });
  });
  await batch.commit();
  return getCategories();
}

export async function addCategory(label: string, order: number) {
  await addDoc(categoriesCol, { label, value: makeValue(label), order });
  invalidateCategoriesCache();
}

export async function updateCategory(id: string, label: string) {
  await updateDoc(doc(db, "categories", id), {
    label,
    value: makeValue(label),
  });
  invalidateCategoriesCache();
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, "categories", id));
  invalidateCategoriesCache();
}