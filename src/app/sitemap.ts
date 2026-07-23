import { MetadataRoute } from "next";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "weekly", priority: 0.3 },
  ];

  try {
    // Capped at 1000 — plenty for a personal blog. If your catalog grows
    // past that, this can be switched to a paginated/segmented sitemap.
    const snap = await getDocs(
      query(
        collection(db, "stories"),
        where("status", "==", "published"),
        limit(1000)
      )
    );

    const storyRoutes: MetadataRoute.Sitemap = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        url: `${SITE_URL}/story/${data.slug}`,
        lastModified: data.updatedAt ? new Date(data.updatedAt) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      };
    });

    return [...staticRoutes, ...storyRoutes];
  } catch {
    // If Firestore is unreachable at build time, still return the static
    // routes rather than failing the whole build.
    return staticRoutes;
  }
}
