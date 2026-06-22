// Single source of truth for the marketing site's service catalog.
//
// Accessed only through getServices() / the derived helpers below so the source
// can later swap to the CRM/DB (admin phase) without touching any consumer.
// Copy lives in the message catalog under `services.items.<slug>.{title,desc,features}`
// — nothing about a service's name/description is hardcoded here.

export type Division = "residential" | "commercial";

export interface Service {
  /** url-safe, stable identifier (also the CRM `service` value + page slug) */
  slug: string;
  division: Division;
  /** lucide-react icon name (resolved by serviceIcon()) */
  icon: string;
  /** shown on the home page */
  featured?: boolean;
}

// Manifest for now; DB-backed later (admin phase). Order here is display order.
const MANIFEST: Service[] = [
  // ── Residential ──────────────────────────────────────────────
  { slug: "standard", division: "residential", icon: "Home", featured: true },
  { slug: "deep-clean", division: "residential", icon: "Sparkles", featured: true },
  { slug: "airbnb", division: "residential", icon: "BedDouble" },
  { slug: "move-in-out", division: "residential", icon: "Truck" },
  { slug: "kitchen-bath", division: "residential", icon: "Bath" },
  { slug: "laundry", division: "residential", icon: "WashingMachine" },
  { slug: "custom", division: "residential", icon: "Wrench" },

  // ── Commercial ───────────────────────────────────────────────
  { slug: "office", division: "commercial", icon: "Building2", featured: true },
  { slug: "churches", division: "commercial", icon: "Church" },
  { slug: "retail", division: "commercial", icon: "Store" },
  { slug: "small-commercial", division: "commercial", icon: "Building" },
];

/** All services, in display order. The single accessor every consumer uses. */
export function getServices(): Service[] {
  return MANIFEST;
}

export function getServicesByDivision(division: Division): Service[] {
  return getServices().filter((s) => s.division === division);
}

export function getFeaturedServices(): Service[] {
  return getServices().filter((s) => s.featured);
}

export function getServiceBySlug(slug: string): Service | undefined {
  return getServices().find((s) => s.slug === slug);
}

export const DIVISIONS: Division[] = ["residential", "commercial"];
