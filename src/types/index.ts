export type StoryType = "blog" | "story";
export type StoryStatus = "draft" | "published";

export interface StoryDoc {
  id: string;
  type: StoryType;
  title: string;
  slug: string;
  category: string; // legacy: category's slug at save time — DEPRECATED, kept only for pre-migration stories. Do not rely on this for filtering.
  categoryId?: string; // source of truth — the categories/{id} doc this story belongs to. Immutable, so renaming a category never breaks this reference.
  authorId?: string; // uid of the user (creator/super_admin) who owns this story. Optional only for stories created before this field existed — see syncStoriesToAuthorId.
  tags: string[];
  summary: string;
  excerpt?: string; // precomputed preview text for blog cards
  coverImage: string;
  status: StoryStatus;
  content?: any; // BlockNote JSON, only for type = "blog"
  commentsEnabled?: boolean; // per-story toggle, set by the owner in the editor. Undefined/missing == enabled (see firestore.rules).
  views: number;
  searchKeywords: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ChapterDoc {
  id: string;
  storyId: string;
  title: string;
  order: number;
}

export interface PartDoc {
  id: string;
  chapterId: string;
  title: string;
  content: any; // BlockNote JSON
  order: number;
}

export interface CommentDoc {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  authorPhotoURL: string;
  createdAt: number;
}

export interface CategoryDoc {
  id: string;
  value: string;
  label: string;
  order: number;
}

// Three-tier access control:
// - super_admin: full control — manages users/roles, categories, site
//   settings, and can edit/delete any story.
// - creator: can write/publish stories, but only manage (edit/delete)
//   their own.
// - user: default role for every new sign-in — can read and comment only.
export type UserRole = "super_admin" | "creator" | "user";

// Private account record — contains email, so only readable by the user
// themself or a super_admin (see firestore.rules). Created automatically
// on first sign-in with role "user"; role can only be changed by a
// super_admin from /dashboard/users.
export interface UserDoc {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: number;
}

// Public-safe subset of a user's profile (no email, no role) — used to show
// "written by ..." on stories without exposing anything private. Any signed
// in user may write their own profile doc; there's nothing sensitive in it.
export interface AuthorProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}