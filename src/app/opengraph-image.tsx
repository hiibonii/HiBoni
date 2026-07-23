import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f7fc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "#1a1a1a",
            letterSpacing: -2,
          }}
        >
          HiBoni
        </div>
        <div
          style={{
            fontSize: 32,
            color: "rgba(26,26,26,0.6)",
            marginTop: 16,
          }}
        >
          Blog & Story Platform
        </div>
      </div>
    ),
    { ...size }
  );
}
