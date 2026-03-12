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
    <section className="py-24 bg-brand-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} />
        <h2 className="font-montserrat font-black text-4xl sm:text-5xl text-brand-white mb-6">
          {t.headline}
        </h2>
        <p className="font-inter text-brand-silver text-lg max-w-2xl mb-10">
          {t.desc}
        </p>
        <div className="flex flex-wrap gap-3">
          {areas.map((area) => (
            <div
              key={area}
              className="flex items-center gap-2 bg-brand-card border border-brand-border rounded-full px-4 py-2"
            >
              <MapPin size={14} className="text-brand-blue flex-shrink-0" />
              <span className="font-inter text-sm text-brand-silver">{area}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
