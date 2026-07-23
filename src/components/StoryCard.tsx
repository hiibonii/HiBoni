import Link from "next/link";
import Image from "next/image";
import { FiStar } from "react-icons/fi";
import { StoryDoc } from "@/types";
import { extractExcerpt } from "@/lib/textExtract";

export default function StoryCard({
  story,
  priority = false,
  categoryLabel,
  authorName,
}: {
  story: StoryDoc;
  priority?: boolean;
  categoryLabel?: string;
  authorName?: string;
}) {
  const preview =
    story.type === "blog"
      ? story.excerpt || extractExcerpt(story.content, 160)
      : story.summary;
  const isFeatured = story.tags?.includes("featured");

  return (
    <Link href={`/story/${story.slug}`} className="block group">
      <div className="relative w-full aspect-[16/10] bg-black/5 overflow-hidden">
        {isFeatured && (
          <span className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-ink text-white text-xs uppercase tracking-wide px-2.5 py-1">
            <FiStar className="fill-current" size={11} /> Featured
          </span>
        )}
        {story.coverImage ? (
          <Image
            src={story.coverImage}
            alt={story.title}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-black/30 text-sm">
            img
          </div>
        )}
      </div>
      <div className="pt-5">
        <p className="text-xs uppercase tracking-wider text-black/50 mb-2">
          {categoryLabel || story.category}
        </p>
        <h3 className="font-bold text-lg leading-snug mb-2 line-clamp-2">{story.title}</h3>
        <p className="text-sm text-black/60 line-clamp-2">{preview}</p>
        {authorName && (
          <p className="text-sm text-black/50 mt-4">Ditulis Oleh {authorName}</p>
        )}
      </div>
    </Link>
  );
}