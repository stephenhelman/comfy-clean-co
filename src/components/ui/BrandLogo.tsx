"use client";

import { useState } from "react";

interface BrandLogoProps {
  /** Rendered height utility, e.g. "h-9". */
  heightClass?: string;
  /** Text-fallback size utility, e.g. "text-lg". */
  textClass?: string;
}

/**
 * Brand wordmark. Shows the white logo image; if it fails to load, falls back
 * to a styled "Comfy Clean Co." wordmark so the chrome never renders empty.
 */
export default function BrandLogo({
  heightClass = "h-9",
  textClass = "text-lg",
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={`font-poppins font-extrabold tracking-tight text-white ${textClass}`}
      >
        Comfy Clean Co.
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/brand/logo-white.png"
      alt="Comfy Clean Co."
      className={`${heightClass} w-auto`}
      onError={() => setFailed(true)}
    />
  );
}
