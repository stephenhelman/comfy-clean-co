// Pure business-info constants + formatters. NO server/db imports — safe to use
// from client and server components alike. Live DB reads live in businessData.ts.

/**
 * Marketing service-area cities. There is no city-name field on BusinessSettings
 * (only `serviceZipCodes`, which holds ZIPs), so this is the single source of
 * truth for both the chips and the prose until an admin-phase field is added.
 * Trimmed in Sprint 1b: Fabens, Clint, and Socorro removed.
 */
export const SERVICE_AREA_CITIES = ["Far East El Paso", "Horizon City"] as const;

/** Canonical fallback phone when BusinessSettings.businessPhone is unset. */
export const PHONE_FALLBACK = "(915) 224-2995";

/**
 * Direct "write a Google review" short link for the business (owner-provided).
 * Takes the user straight to the review dialog — preferred over the place-id
 * constructed URL for the "Review us on Google" CTAs.
 */
export const GOOGLE_WRITE_REVIEW_URL = "https://g.page/r/CV2EtHr7Oxw8EBM/review";

const BUSINESS_NAME = "Comfy Clean Co";
const BUSINESS_LOCALITY = "El Paso TX";

function digits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Normalize any stored phone to a standard "(915) 224-2995" display. */
export function formatPhone(raw: string): string {
  const d = digits(raw).replace(/^1(?=\d{10}$)/, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return raw;
}

/** "tel:+19152242995" from any stored format. */
export function phoneHref(raw: string): string {
  let d = digits(raw);
  if (d.length === 10) d = `1${d}`;
  return `tel:+${d}`;
}

/** Link to the business's Google reviews; falls back to a Maps search when no place id. */
export function googleReviewsUrl(placeId: string | null): string {
  return placeId
    ? `https://search.google.com/local/reviews?placeid=${placeId}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${BUSINESS_NAME} ${BUSINESS_LOCALITY}`)}`;
}

/** "Write a review" deep link; falls back to a Maps search when no place id. */
export function googleWriteReviewUrl(placeId: string | null): string {
  return placeId
    ? `https://search.google.com/local/writereview?placeid=${placeId}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${BUSINESS_NAME} ${BUSINESS_LOCALITY}`)}`;
}
