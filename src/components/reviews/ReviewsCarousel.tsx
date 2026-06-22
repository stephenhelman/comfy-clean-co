"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import StarRating from "./StarRating";
import type { ReviewCard } from "@/lib/businessData";

interface ReviewsCarouselProps {
  reviews: ReviewCard[];
  labels: { prev: string; next: string };
}

/**
 * Lightweight CSS scroll-snap carousel (no JS animation dependency). Prev/next
 * scroll by one card; keyboard-operable buttons; honors reduced motion by using
 * instant scrolling when requested.
 */
export default function ReviewsCarousel({ reviews, labels }: ReviewsCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);

  function scrollByCards(dir: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-review-card]");
    const amount = card ? card.offsetWidth + 24 : track.clientWidth * 0.8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: dir * amount, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="relative">
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((r) => (
          <li
            key={r.id}
            data-review-card
            className="w-[85%] shrink-0 snap-start sm:w-[360px]"
          >
            <figure className="flex h-full flex-col rounded-2xl border border-gray-200/80 bg-brand-off-white p-6 shadow-sm">
              <StarRating rating={r.rating} className="mb-3" />
              {r.text && (
                <blockquote className="mb-5 flex-1 font-inter text-sm leading-relaxed text-brand-navy-dark/90">
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
          </li>
        ))}
      </ul>

      {reviews.length > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label={labels.prev}
            className="press flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label={labels.next}
            className="press flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
