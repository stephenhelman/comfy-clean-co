import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Comfy Clean Co - Professional Cleaning Services in El Paso, TX";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1a2744",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#5BB8E8",
            letterSpacing: "-2px",
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          Comfy Clean Co
        </div>
        <div
          style={{
            fontSize: 36,
            color: "#ffffff",
            marginTop: 28,
            textAlign: "center",
            opacity: 0.9,
          }}
        >
          Professional Cleaning Services in El Paso, TX
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#5BB8E8",
            marginTop: 16,
            textAlign: "center",
            opacity: 0.75,
          }}
        >
          Far East El Paso · Residential &amp; Commercial
        </div>
      </div>
    ),
    { ...size }
  );
}
