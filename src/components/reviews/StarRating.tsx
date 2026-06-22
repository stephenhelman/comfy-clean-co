import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  size?: number;
  className?: string;
}

/** Five-star row; whole-star fill (Google ratings are integers per review). */
export default function StarRating({ rating, size = 16, className = "" }: StarRatingProps) {
  const rounded = Math.round(rating);
  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < rounded ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}
          strokeWidth={0}
        />
      ))}
    </div>
  );
}
