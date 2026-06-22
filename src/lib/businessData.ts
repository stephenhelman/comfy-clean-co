import { cache } from "react";
import { db } from "@/lib/db";
import { PHONE_FALLBACK } from "@/lib/businessInfo";

/**
 * Server-only reads of admin-managed business info from BusinessSettings.
 * Request-deduped with React cache() so the shared marketing layout can call
 * getBusinessPhone() without N duplicate queries per render.
 */

export const getBusinessPhone = cache(async (): Promise<string> => {
  try {
    const bs = await db.businessSettings.findFirst({ select: { businessPhone: true } });
    return bs?.businessPhone?.trim() || PHONE_FALLBACK;
  } catch {
    return PHONE_FALLBACK;
  }
});

export interface ReviewCard {
  id: string;
  authorName: string;
  rating: number;
  text: string | null;
  publishedAt: Date;
}

export interface ReviewsData {
  reviews: ReviewCard[];
  rating: number | null;
  count: number | null;
  placeId: string | null;
}

/**
 * Reviews for public display: non-flagged, rating >= 4, newest first, take 8.
 * Aggregate rating/count + googlePlaceId come from BusinessSettings. Read-only —
 * no Google polling, no writes, no admin-pipeline involvement.
 */
export const getReviewsData = cache(async (): Promise<ReviewsData> => {
  try {
    const [bs, reviews] = await Promise.all([
      db.businessSettings.findFirst({
        select: { googleOverallRating: true, googleTotalRatings: true, googlePlaceId: true },
      }),
      db.googleReview.findMany({
        where: { flagged: false, rating: { gte: 4 } },
        orderBy: { publishedAt: "desc" },
        take: 8,
        select: { id: true, authorName: true, rating: true, text: true, publishedAt: true },
      }),
    ]);
    return {
      reviews,
      rating: bs?.googleOverallRating ?? null,
      count: bs?.googleTotalRatings ?? null,
      placeId: bs?.googlePlaceId ?? null,
    };
  } catch {
    return { reviews: [], rating: null, count: null, placeId: null };
  }
});
