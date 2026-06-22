import type { Metadata } from "next";

const BASE_URL = "https://comfycleanco.com";

/**
 * Locale-aware canonical + hreflang under `localePrefix: "as-needed"`:
 * EN lives at the unprefixed path, ES at `/es<path>`. Canonical is
 * self-referential per locale; `languages` emits both + x-default (EN).
 *
 * @param path leading-slash path without locale, "" for home (e.g. "/services").
 */
export function localeAlternates(locale: string, path: string): Metadata["alternates"] {
  const en = `${BASE_URL}${path}`;
  const es = `${BASE_URL}/es${path}`;
  return {
    canonical: locale === "es" ? es : en,
    languages: {
      en,
      es,
      "x-default": en,
    },
  };
}
