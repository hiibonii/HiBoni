import type { Metadata } from "next";
import { cache } from "react";
import { getStoryBySlug } from "@/lib/firestore";
import DetailClient from "./DetailClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// React's cache() dedupes calls with the same argument within a single
// request — so generateMetadata and the page body below share one Firestore
// read instead of two.
const getStory = cache((slug: string) => getStoryBySlug(slug, false));

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  // Public metadata only ever describes published stories — drafts stay
  // un-indexed and un-previewed by link-unfurlers (Twitter/WhatsApp/etc.).
  const story = await getStory(params.slug);

  if (!story) {
    return { title: "Not Found", robots: { index: false, follow: false } };
  }

  const description =
    (story.type === "blog" ? story.excerpt : story.summary) ||
    "Baca selengkapnya di HiBoni.";
  const url = `${SITE_URL}/story/${story.slug}`;
  const ogImageUrl = `${SITE_URL}/story/${story.slug}/opengraph-image`;

  return {
    title: story.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: story.title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      tags: story.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: story.title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function StoryDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  // (Deduped with generateMetadata's call above via cache().) Used here to
  // emit Article structured data (JSON-LD) for rich search results. The
  // actual interactive page — including draft-preview support for the
  // logged-in admin — is still handled client-side in DetailClient, since
  // it depends on Firebase Auth state and live Firestore data (comments,
  // view counter, part navigation).
  const story = await getStory(params.slug);

  const jsonLd = story
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: story.title,
        description:
          (story.type === "blog" ? story.excerpt : story.summary) || "",
        image: story.coverImage ? [story.coverImage] : [],
        datePublished: new Date(story.createdAt).toISOString(),
        dateModified: new Date(story.updatedAt).toISOString(),
        author: [{ "@type": "Organization", name: "HiBoni" }],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            // JSON.stringify does NOT escape "<", so a title/summary
            // containing the literal text "</script>" would otherwise
            // close this tag early and let arbitrary HTML/script run on
            // every visitor's page for this story (stored XSS, since
            // titles/summaries come from Creator accounts — a lower-trust
            // role than Super Admin in this app's own model). Escaping "<"
            // to its unicode form neutralizes that while staying valid,
            // identical JSON.
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <DetailClient initialStory={story} />
    </>
  );
}
