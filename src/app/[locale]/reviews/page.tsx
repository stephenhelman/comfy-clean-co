import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import SectionLabel from "@/components/ui/SectionLabel";
import Reveal from "@/components/ui/Reveal";
import StarRating from "@/components/reviews/StarRating";
import GoogleBadge from "@/components/reviews/GoogleBadge";
import ReviewsCarousel from "@/components/reviews/ReviewsCarousel";
import { getReviewsData } from "@/lib/businessData";
import { googleReviewsUrl, GOOGLE_WRITE_REVIEW_URL } from "@/lib/businessInfo";
import { localeAlternates } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localeAlternates(locale, "/reviews"),
  };
}

export default async function ReviewsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviews" });
  const { reviews, rating, count, placeId } = await getReviewsData();

  const reviewsUrl = googleReviewsUrl(placeId);
  const writeUrl = GOOGLE_WRITE_REVIEW_URL;
  const hasReviews = reviews.length > 0;

  return (
    <div className="section-py min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t("label")} />
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-display mb-4 font-poppins font-bold text-brand-navy">{t("headline")}</h1>
            <p className="max-w-xl font-inter text-lg leading-relaxed text-brand-navy-dark/90">
              {t("subhead")}
            </p>
          </div>
          {/* Aggregate rating, when the admin pipeline has populated it */}
          {rating != null && (
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200/80 bg-brand-off-white px-5 py-4">
              <span className="font-poppins text-3xl font-extrabold text-brand-navy">{rating.toFixed(1)}</span>
              <div>
                <StarRating rating={rating} />
                {count != null && (
                  <p className="mt-1 font-inter text-xs text-brand-navy-dark/70">
                    {t("ratingCount", { count })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {hasReviews ? (
          <Reveal>
            <div className="mb-5">
              <GoogleBadge label={t("fromGoogle")} href={reviewsUrl} />
            </div>
            <ReviewsCarousel reviews={reviews} labels={{ prev: t("prev"), next: t("next") }} />
          </Reveal>
        ) : (
          // Empty state — the current reality (zero stored reviews). First-class, not broken.
          <Reveal>
            <div className="flex flex-col items-center rounded-2xl border border-gray-200/80 bg-brand-off-white px-6 py-16 text-center">
              <StarRating rating={5} size={22} className="mb-4" />
              <h2 className="mb-2 font-poppins text-xl font-bold text-brand-navy">{t("emptyTitle")}</h2>
              <p className="mb-8 max-w-md font-inter text-brand-navy-dark/80">{t("emptyBody")}</p>
              <a
                href={writeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center justify-center rounded-lg bg-brand-green px-6 py-3 font-poppins text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-green-dark"
              >
                {t("reviewUsCta")}
              </a>
              <div className="mt-6">
                <GoogleBadge label={t("viaGoogle")} href={reviewsUrl} />
              </div>
            </div>
          </Reveal>
        )}

        {/* "Review us on Google" is useful even when reviews exist */}
        {hasReviews && (
          <div className="mt-10 text-center">
            <a
              href={writeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 font-poppins text-sm font-bold uppercase tracking-wider text-brand-green-dark transition-colors hover:text-brand-green"
            >
              {t("reviewUsCta")}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
