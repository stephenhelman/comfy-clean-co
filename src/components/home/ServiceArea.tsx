import { MapPin } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";

interface ServiceAreaProps {
  t: {
    label: string;
    headline: string;
    desc: string;
  };
}

export default function ServiceArea({ t }: ServiceAreaProps) {
  const areas = ["Far East El Paso", "Horizon City", "Socorro", "Clint", "Fabens"];

  return (
    <section className="py-24 bg-brand-gray-light">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} />
        <h2 className="font-poppins font-bold text-4xl sm:text-5xl text-brand-navy mb-6">
          {t.headline}
        </h2>
        <p className="font-inter text-brand-navy-dark text-lg max-w-2xl mb-10">
          {t.desc}
        </p>
        <div className="flex flex-wrap gap-3">
          {areas.map((area) => (
            <div
              key={area}
              className="flex items-center gap-2 bg-white border border-brand-green/30 rounded-full px-4 py-2 shadow-sm"
            >
              <MapPin size={14} className="text-brand-green shrink-0" />
              <span className="font-inter text-sm text-brand-navy-dark">{area}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
