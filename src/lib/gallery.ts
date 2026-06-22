// Gallery source of truth, mirroring the getServices() pattern so a DB/CRM
// source (admin-phase uploads) can swap in behind getGalleryItems() without
// touching the page. Shaped for before/after pairs.

export interface GalleryItem {
  /** Image URL (before). */
  before: string;
  /** Image URL (after). */
  after: string;
  /** Short caption describing the job. */
  caption: string;
}

/**
 * Manifest for now — intentionally empty (no real photos yet). The page renders
 * a first-class "coming soon" state until real pairs are supplied.
 */
export function getGalleryItems(): GalleryItem[] {
  return [];
}
