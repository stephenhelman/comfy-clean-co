import type { LucideIcon } from "lucide-react";

interface CardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  features?: string[];
  className?: string;
}

/**
 * Single canonical service card. Used on the home ServicesOverview and the
 * Services page (differentiated by content/props, not duplicated markup).
 * Subtle hover lift; the green top-accent ties it to the brand.
 */
export default function Card({ icon: Icon, title, desc, features, className = "" }: CardProps) {
  return (
    <div
      className={`group relative h-full rounded-2xl border border-gray-200/80 bg-brand-off-white p-7 shadow-sm transition-[transform,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-navy/5 ${className}`}
    >
      {/* Green top accent */}
      <span className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-brand-green" aria-hidden="true" />

      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green-pale transition-transform duration-300 ease-out-quart group-hover:scale-105">
        <Icon size={24} className="text-brand-green" strokeWidth={2} />
      </div>

      <h3 className="mb-2 font-poppins text-xl font-bold text-brand-navy">{title}</h3>
      <p className="mb-4 font-inter text-sm leading-relaxed text-brand-navy-dark/90">{desc}</p>

      {features && features.length > 0 && (
        <ul className="mt-auto space-y-2 border-t border-gray-200/70 pt-4">
          {features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2.5 font-inter text-sm text-brand-navy-dark"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
