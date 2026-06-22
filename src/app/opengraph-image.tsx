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
          background: "linear-gradient(135deg, #2B5C78 0%, #1A3A4A 100%)",
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
            fontSize: 84,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2px",
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          Comfy Clean Co
        </div>
        {/* Brand green underline accent */}
        <div
          style={{
            width: 120,
            height: 6,
            borderRadius: 3,
            background: "#51A755",
            marginTop: 28,
          }}
        />
        <div
          style={{
            fontSize: 36,
            color: "#ffffff",
            marginTop: 28,
            textAlign: "center",
            opacity: 0.92,
          }}
        >
          Professional Cleaning Services in El Paso, TX
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#6DC272",
            marginTop: 16,
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          Far East El Paso · Residential &amp; Commercial
        </div>
      </div>
    ),
    { ...size }
  );
}
