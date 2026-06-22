import type { Metadata } from "next";

const description =
  "Professional residential and commercial cleaning in Far East El Paso, TX. Trusted house cleaning, deep clean, move-out, and commercial services. Book today.";

export const metadata: Metadata = {
  metadataBase: new URL("https://comfycleanco.com"),
  title: {
    default: "Comfy Clean Co | Professional Cleaning Services in El Paso, TX",
    template: "%s | Comfy Clean Co",
  },
  description,
  keywords: [
    "cleaning service",
    "house cleaning",
    "maid service",
    "El Paso cleaning",
    "Far East El Paso",
    "deep clean",
    "move out cleaning",
    "commercial cleaning",
  ],
  // og:image / twitter:image are supplied by the file-based dynamic generator
  // at src/app/opengraph-image.tsx (no broken static override).
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Comfy Clean Co",
    url: "https://comfycleanco.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Comfy Clean Co | Professional Cleaning Services in El Paso, TX",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://comfycleanco.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
