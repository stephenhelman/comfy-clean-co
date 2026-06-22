import type { GalleryItem } from "@/lib/gallery";

interface BeforeAfterCardProps {
  item: GalleryItem;
  labels: { before: string; after: string };
}

/**
 * Before/after pair card — ready to receive real photos. Swap-in target for the
 * gallery source (getGalleryItems). Plain <img> keeps it source-agnostic for
 * future remote/CRM URLs.
 */
export default function BeforeAfterCard({ item, labels }: BeforeAfterCardProps) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-gray-200/80 bg-brand-off-white shadow-sm">
      <div className="grid grid-cols-2">
        {(["before", "after"] as const).map((key) => (
          <div key={key} className="relative aspect-[4/3] bg-brand-green-pale">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item[key]} alt={`${labels[key]} — ${item.caption}`} className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-md bg-brand-navy/85 px-2 py-0.5 font-poppins text-[10px] font-bold uppercase tracking-wider text-white">
              {labels[key]}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="px-5 py-4 font-inter text-sm text-brand-navy-dark">{item.caption}</figcaption>
    </figure>
  );
}
