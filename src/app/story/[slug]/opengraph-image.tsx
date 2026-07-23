import { ImageResponse } from "next/og";
import { getStoryBySlug } from "@/lib/firestore";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const story = await getStoryBySlug(params.slug, false);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
          backgroundColor: "#1a1a1a",
          fontFamily: "sans-serif",
        }}
      >
        {story?.coverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={story.coverImage}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1200px",
              height: "630px",
              objectFit: "cover",
              opacity: 0.55,
            }}
          />
        )}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            padding: "64px",
          }}
        >
          {story && (
            <div
              style={{
                display: "flex",
                color: "#ffffff",
                fontSize: 24,
                textTransform: "uppercase",
                letterSpacing: 4,
                marginBottom: 20,
                opacity: 0.8,
              }}
            >
              {story.category}
            </div>
          )}
          <div
            style={{
              display: "flex",
              color: "#ffffff",
              fontSize: 60,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: "1000px",
            }}
          >
            {story?.title || "HiBoni"}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
