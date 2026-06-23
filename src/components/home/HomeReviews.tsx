import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatDistanceToNow } from "date-fns";
import SectionLabel from "@/components/ui/SectionLabel";
import Reveal from "@/components/ui/Reveal";
import StarRating from "@/components/reviews/StarRating";
import GoogleBadge from "@/components/reviews/GoogleBadge";
import { getReviewsData } from "@/lib/businessData";
import { GOOGLE_WRITE_REVIEW_URL } from "@/lib/businessInfo";

/**
 * Home-page social proof: the live Google reviews + aggregate, a deep link to
 * the full Reviews page, and a direct "Review us on Google" CTA. Renders nothing
 * when there are no qualifying reviews (the dedicated page owns the empty state).
 */
export default async function HomeReviews({ locale }: { locale: string }) {
  const { reviews, rating, count } = await getReviewsData();
  if (reviews.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "reviews" });
  const top = reviews.slice(0, 3);

  return (
    <section className="section-py bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t("label")} />
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-section max-w-2xl font-poppins font-bold text-brand-navy">
            {t("homeHeadline")}
          </h2>
          {rating != null && (
            <div className="flex items-center gap-3">
              <span className="font-poppins text-3xl font-extrabold text-brand-navy">{rating.toFixed(1)}</span>
              <div>
                <StarRating rating={rating} />
                {count != null && (
                  <p className="mt-1 font-inter text-xs text-brand-navy-dark/70">{t("ratingCount", { count })}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {top.map((r, i) => (
            <Reveal key={r.id} delay={i * 80} className="h-full">
              <figure className="flex h-full flex-col rounded-2xl border border-gray-200/80 bg-brand-off-white p-6 shadow-sm">
                <StarRating rating={r.rating} className="mb-3" />
                {r.text && (
                  <blockquote className="mb-5 line-clamp-5 flex-1 font-inter text-sm leading-relaxed text-brand-navy-dark/90">
                    {r.text}
                  </blockquote>
                )}
                <figcaption className="mt-auto flex items-center justify-between gap-3 border-t border-gray-200/70 pt-4">
                  <span className="font-poppins text-sm font-bold text-brand-navy">{r.authorName}</span>
                  <span className="font-inter text-xs text-brand-navy-dark/60">
                    {formatDistanceToNow(r.publishedAt, { addSuffix: true })}
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Link
            href={`/${locale}/reviews`}
            className="group inline-flex items-center gap-1.5 font-poppins text-sm font-bold uppercase tracking-wider text-brand-green-dark transition-colors hover:text-brand-green"
          >
            {t("readAll")}
            <ArrowRight
              size={15}
              className="transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
            />
          </Link>
          <GoogleBadge label={t("reviewUsCta")} href={GOOGLE_WRITE_REVIEW_URL} />
        </div>
      </div>
    </section>
  );
}
