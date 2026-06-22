import type { MetadataRoute } from "next";
import { getServices } from "@/lib/services";

const BASE_URL = "https://comfycleanco.com";

type Entry = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

const ENTRIES: Entry[] = [
  { path: "", changeFrequency: "monthly", priority: 1.0 },
  { path: "/services", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "yearly", priority: 0.6 },
  { path: "/reviews", changeFrequency: "weekly", priority: 0.6 },
  { path: "/gallery", changeFrequency: "monthly", priority: 0.5 },
  { path: "/book", changeFrequency: "weekly", priority: 0.9 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.5 },
  ...getServices().map(
    (s): Entry => ({ path: `/services/${s.slug}`, changeFrequency: "monthly", priority: 0.6 }),
  ),
];

export default function sitemap(): MetadataRoute.Sitemap {
  // EN lives at the unprefixed path, ES at /es<path> (localePrefix: as-needed).
  // Each entry lists both locales via alternates.languages.
  return ENTRIES.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency,
    priority,
    alternates: {
      languages: {
        en: `${BASE_URL}${path}`,
        es: `${BASE_URL}/es${path}`,
      },
    },
  }));
}
