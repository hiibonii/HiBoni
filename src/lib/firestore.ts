import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  increment,
  getCountFromServer,
  getAggregateFromServer,
  sum,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { StoryDoc, ChapterDoc, PartDoc } from "@/types";
import { extractExcerpt } from "./textExtract";

const storiesCol = collection(db, "stories");
const contentDocRef = (storyId: string) =>
  doc(db, "stories", storyId, "content", "body");

export function makeSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function makeKeywords(title: string) {
  return Array.from(
    new Set(
      title
        .toLowerCase()
        // Strip punctuation (keep letters/numbers/spaces/hyphens) so a title
        // like "Kenapa? Aku Pergi." doesn't store "kenapa?" / "pergi." as
        // keywords that a plain-text search would never match.
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .split(/\s+/)
        .filter(Boolean)
    )
  );
}

// ---------- STORIES ----------

export async function createStory(data: Partial<StoryDoc>) {
  const now = Date.now();
  const { content, ...rest } = data;

  const payload: any = {
    ...rest,
    slug: makeSlug(data.title || "untitled"),
    titleLower: (data.title || "untitled").toLowerCase(),
    searchKeywords: [
      ...makeKeywords(data.title || ""),
      ...(data.tags || []),
    ],
    excerpt: data.type === "blog" ? extractExcerpt(content, 160) : "",
    views: 0,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(storiesCol, payload);

  // Blog body text is kept in a separate subdocument so listing pages
  // (Home, Search) never have to download the full article just to show
  // a card — they only read the lightweight `stories/{id}` doc above.
  if (data.type === "blog" && content) {
    await setDoc(contentDocRef(ref.id), { blocks: content });
  }

  return ref.id;
}

export async function updateStory(id: string, data: Partial<StoryDoc>) {
  const ref = doc(db, "stories", id);
  const { content, ...rest } = data;
  const payload: any = { ...rest, updatedAt: Date.now() };

  if (data.title || data.tags) {
    payload.searchKeywords = [
      ...makeKeywords(data.title || ""),
      ...(data.tags || []),
    ];
  }
  if (data.title) {
    payload.slug = makeSlug(data.title);
    payload.titleLower = data.title.toLowerCase();
  }
  if (data.type === "blog" && content !== undefined) {
    payload.excerpt = extractExcerpt(content, 160);
    await setDoc(contentDocRef(id), { blocks: content });
  }

  await updateDoc(ref, payload);
}

export async function getBlogContent(storyId: string) {
  const snap = await getDoc(contentDocRef(storyId));
  return snap.exists() ? snap.data().blocks : [];
}

// Attaches the blog body (from the content subdocument) onto a story object.
// Falls back to a `content` field embedded directly on the doc, for stories
// created before this content/excerpt split existed.
async function attachContent(story: StoryDoc): Promise<StoryDoc> {
  if (story.type !== "blog") return story;
  if (Array.isArray((story as any).content) && (story as any).content.length > 0) {
    return story; // legacy doc already has inline content
  }
  const blocks = await getBlogContent(story.id);
  return { ...story, content: blocks };
}

export async function deleteStory(id: string) {
  await deleteDoc(doc(db, "stories", id));
  await deleteDoc(contentDocRef(id)).catch(() => {});
}

export async function getStoryById(id: string) {
  const snap = await getDoc(doc(db, "stories", id));
  if (!snap.exists()) return null;
  const story = { id: snap.id, ...snap.data() } as StoryDoc;
  return attachContent(story);
}

export async function getStoryBySlug(slug: string, includeDrafts = false) {
  // Must filter by status in the query itself: Firestore rejects a whole
  // list/query request if the security rule depends on a field (status)
  // that isn't constrained by the query's own where() clauses.
  const publishedQ = query(
    storiesCol,
    where("slug", "==", slug),
    where("status", "==", "published"),
    limit(1)
  );
  let snap = await getDocs(publishedQ);

  if (snap.empty && includeDrafts) {
    // Only attempted when the caller is authenticated (e.g. previewing a
    // draft from the dashboard) — the rule allows unrestricted list access
    // for any signed-in user, so this second query is safe to run.
    const allQ = query(storiesCol, where("slug", "==", slug), limit(1));
    snap = await getDocs(allQ);
  }

  if (snap.empty) return null;
  const d = snap.docs[0];
  const story = { id: d.id, ...d.data() } as StoryDoc;
  return attachContent(story);
}

export async function incrementViews(id: string) {
  await updateDoc(doc(db, "stories", id), { views: increment(1) });
}

export async function getPublishedStories(opts: {
  categoryId?: string;
  sort?: "latest" | "trending"; // default "latest" — see getDiscoverStories for the random feed
  pageSize?: number;
  cursor?: QueryDocumentSnapshot | null;
}) {
  const sortField = opts.sort === "trending" ? "views" : "createdAt";
  const constraints: any[] = [
    where("status", "==", "published"),
    orderBy(sortField, "desc"),
  ];
  if (opts.categoryId && opts.categoryId !== "all") {
    constraints.splice(1, 0, where("categoryId", "==", opts.categoryId));
  }
  constraints.push(limit(opts.pageSize || 6));
  if (opts.cursor) constraints.push(startAfter(opts.cursor));

  const q = query(storiesCol, ...constraints);
  const snap = await getDocs(q);
  return {
    items: snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoryDoc)),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
  };
}

export async function getPublishedStoriesCount(categoryId?: string) {
  const constraints: any[] = [where("status", "==", "published")];
  if (categoryId && categoryId !== "all") {
    constraints.push(where("categoryId", "==", categoryId));
  }
  const snap = await getCountFromServer(query(storiesCol, ...constraints));
  return snap.data().count;
}

// "Discover" feed — a shuffled sample of published stories. Firestore has
// no native random-order query, so this fetches a capped, most-recent
// batch and the caller (Home page) shuffles it client-side once and
// paginates over that fixed shuffled array in memory. The cap keeps this
// cheap regardless of how large the stories collection eventually grows;
// it trades "truly every story is equally likely" for "cheap and good
// enough" at personal-blog scale — revisit with a dedicated random-sort
// key field if the catalog ever grows past a few hundred stories.
const DISCOVER_BATCH_CAP = 60;

export async function getDiscoverStories(categoryId?: string) {
  const constraints: any[] = [where("status", "==", "published")];
  if (categoryId && categoryId !== "all") {
    constraints.push(where("categoryId", "==", categoryId));
  }
  constraints.push(orderBy("createdAt", "desc"), limit(DISCOVER_BATCH_CAP));
  const snap = await getDocs(query(storiesCol, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoryDoc));
}

const FEATURED_TAG = "featured";

// Stories/blogs tagged "Featured" (stored lowercase, like all tags) — used
// to pin them at the very top of Home's first page. Capped at 6 so a large
// batch of featured items can't crowd out everything else.
export async function getFeaturedStories(categoryId?: string) {
  const constraints: any[] = [
    where("status", "==", "published"),
    where("tags", "array-contains", FEATURED_TAG),
  ];
  if (categoryId && categoryId !== "all") {
    constraints.push(where("categoryId", "==", categoryId));
  }
  constraints.push(orderBy("createdAt", "desc"), limit(6));
  const snap = await getDocs(query(storiesCol, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoryDoc));
}

export interface DashboardQueryOpts {
  type?: "all" | "blog" | "story";
  searchTerm?: string;
  authorId?: string; // scopes results to one author — used for creators, who may only see their own stories
  pageSize: number;
  cursor?: QueryDocumentSnapshot | null;
}

function buildDashboardWhereConstraints(opts: {
  type?: "all" | "blog" | "story";
  searchTerm?: string;
  authorId?: string;
}) {
  const constraints: any[] = [];
  if (opts.authorId) {
    constraints.push(where("authorId", "==", opts.authorId));
  }
  if (opts.type && opts.type !== "all") {
    constraints.push(where("type", "==", opts.type));
  }
  const term = (opts.searchTerm || "").trim().toLowerCase();
  if (term) {
    // Prefix search on the lowercase title field — Firestore has no native
    // substring search, so this matches titles that START WITH the typed
    // text (the standard Firestore pattern for this).
    constraints.push(where("titleLower", ">=", term));
    constraints.push(where("titleLower", "<=", term + "\uf8ff"));
  }
  return constraints;
}

// Paginated dashboard story list — filtering (by type / title-prefix search
// / author ownership) and pagination all happen in the Firestore query
// itself, so only one page's worth of documents (≤ pageSize) is ever
// downloaded.
//
// NOTE: combining filters (e.g. authorId + type, or authorId + search) may
// need a Firestore composite index. The first time a new combination runs,
// Firestore throws an error in the browser console containing a direct
// link to auto-create the missing index — click it.
export async function getDashboardStoriesPage(opts: DashboardQueryOpts) {
  const constraints = buildDashboardWhereConstraints(opts);
  const term = (opts.searchTerm || "").trim().toLowerCase();
  constraints.push(term ? orderBy("titleLower", "asc") : orderBy("updatedAt", "desc"));
  constraints.push(limit(opts.pageSize));
  if (opts.cursor) constraints.push(startAfter(opts.cursor));

  const snap = await getDocs(query(storiesCol, ...constraints));
  return {
    items: snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoryDoc)),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
  };
}

export async function getDashboardStoriesCount(opts: {
  type?: "all" | "blog" | "story";
  searchTerm?: string;
  authorId?: string;
}) {
  const constraints = buildDashboardWhereConstraints(opts);
  const snap = await getCountFromServer(query(storiesCol, ...constraints));
  return snap.data().count;
}

// Site-wide (or, for a creator, own-content-only) totals for the
// dashboard's summary cards. These run as aggregate (count/sum) queries
// independent of the paginated table above, so the cards stay accurate
// regardless of which page/filter is showing.
//
// authorId MUST be passed for a creator: firestore.rules only lets a
// creator read their own stories plus published ones, so an unscoped
// aggregate (which implicitly touches every draft, including other
// authors') would be rejected outright rather than just under-counting.
export async function getDashboardStats(authorId?: string) {
  const base = authorId ? [where("authorId", "==", authorId)] : [];
  const [totalSnap, draftSnap, storyTypeSnap, viewsSnap] = await Promise.all([
    getCountFromServer(query(storiesCol, ...base)),
    getCountFromServer(query(storiesCol, ...base, where("status", "==", "draft"))),
    getCountFromServer(query(storiesCol, ...base, where("type", "==", "story"))),
    getAggregateFromServer(query(storiesCol, ...base), { totalViews: sum("views") }),
  ]);
  return {
    totalStories: totalSnap.data().count,
    draftCount: draftSnap.data().count,
    storyTypeCount: storyTypeSnap.data().count,
    totalViews: (viewsSnap.data().totalViews as number) || 0,
  };
}

// One-time backfill: stories created before `categoryId` existed only have
// the legacy `category` slug. This matches that slug against the current
// categories collection and stamps the immutable `categoryId` onto every
// story that's missing it — after this, filtering/display never depends on
// a slug that can go stale again. Safe to re-run any time (skips stories
// that already have categoryId, and simply leaves alone any story whose
// old slug no longer matches any existing category — e.g. that category
// was deleted since; those need a manual category re-pick in the editor).
export async function syncStoriesToCategoryIds(
  categories: { id: string; value: string }[]
) {
  const valueToId = new Map(categories.map((c) => [c.value, c.id]));

  const snap = await getDocs(query(storiesCol));
  let updated = 0;
  let skippedNoMatch = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as StoryDoc;
    if (data.categoryId) continue; // already migrated
    const matchedId = valueToId.get(data.category);
    if (!matchedId) {
      skippedNoMatch++;
      continue;
    }
    await updateDoc(doc(db, "stories", docSnap.id), { categoryId: matchedId });
    updated++;
  }

  return { updated, skippedNoMatch, total: snap.docs.length };
}

// One-time backfill: stories created before roles/authorId existed have no
// `authorId` at all — they were all written by the single original CMS
// owner. Stamps the given uid (the super_admin running this from Settings)
// onto every story missing authorId. Safe to re-run; skips anything
// already set.
export async function syncStoriesToAuthorId(uid: string) {
  const snap = await getDocs(query(storiesCol));
  let updated = 0;
  let failed = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as StoryDoc;
    if (data.authorId) continue; // already migrated
    try {
      await updateDoc(doc(db, "stories", docSnap.id), { authorId: uid });
      updated++;
    } catch (err) {
      // Don't let one failing doc (e.g. a transient permission hiccup)
      // silently abort the rest of the batch — keep going and report the
      // count so it's visible instead of invisible.
      failed++;
    }
  }

  return { updated, failed, total: snap.docs.length };
}

export async function searchStories(term: string) {
  // searchKeywords stores individual words (see makeKeywords), so the query
  // must search word-by-word too — matching the whole typed phrase as one
  // string against that array would never find anything except a single-
  // word search that happens to equal one exact keyword.
  const words = Array.from(
    new Set(
      term
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s-]/gu, "")
        .split(/\s+/)
        .filter(Boolean)
    )
  ).slice(0, 10); // Firestore's array-contains-any allows at most 10 values

  if (words.length === 0) return [];

  const q = query(
    storiesCol,
    where("status", "==", "published"),
    where("searchKeywords", "array-contains-any", words),
    limit(30)
  );
  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoryDoc));

  // array-contains-any matches a story if it has ANY of the words (OR).
  // Rank stories that match more of the typed words higher, so a multi-word
  // title search still surfaces the best match first.
  return results
    .map((story) => ({
      story,
      matched: words.filter((w) => story.searchKeywords?.includes(w)).length,
    }))
    .sort((a, b) => b.matched - a.matched)
    .map((r) => r.story)
    .slice(0, 20);
}

// ---------- CHAPTERS ----------

export async function createChapter(storyId: string, title: string, order: number) {
  const ref = await addDoc(collection(db, "stories", storyId, "chapters"), {
    storyId,
    title,
    order,
  });
  return ref.id;
}

export async function updateChapter(storyId: string, chapterId: string, data: Partial<ChapterDoc>) {
  await updateDoc(doc(db, "stories", storyId, "chapters", chapterId), data);
}

export async function deleteChapter(storyId: string, chapterId: string) {
  await deleteDoc(doc(db, "stories", storyId, "chapters", chapterId));
}

export async function getChapters(storyId: string) {
  const q = query(collection(db, "stories", storyId, "chapters"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChapterDoc));
}

// ---------- PARTS ----------

export async function createPart(
  storyId: string,
  chapterId: string,
  title: string,
  content: any,
  order: number
) {
  const ref = await addDoc(
    collection(db, "stories", storyId, "chapters", chapterId, "parts"),
    { chapterId, title, content, order }
  );
  return ref.id;
}

export async function updatePart(
  storyId: string,
  chapterId: string,
  partId: string,
  data: Partial<PartDoc>
) {
  await updateDoc(
    doc(db, "stories", storyId, "chapters", chapterId, "parts", partId),
    data
  );
}

export async function deletePart(storyId: string, chapterId: string, partId: string) {
  await deleteDoc(doc(db, "stories", storyId, "chapters", chapterId, "parts", partId));
}

// freeOnly restricts the query to order < 2 (the first two parts) — used
// for signed-out visitors. This isn't just a display nicety: Firestore
// denies an ENTIRE list query if any potential match would fail the
// security rule, so a signed-out reader fetching an unfiltered part list
// from a gated chapter would get a permission error for the whole
// request, not just the locked parts. Constraining the query itself to
// what the rule actually allows keeps the free preview working.
export async function getParts(storyId: string, chapterId: string, freeOnly = false) {
  const constraints: any[] = [];
  if (freeOnly) constraints.push(where("order", "<", 2));
  constraints.push(orderBy("order", "asc"));
  const q = query(
    collection(db, "stories", storyId, "chapters", chapterId, "parts"),
    ...constraints
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PartDoc));
}