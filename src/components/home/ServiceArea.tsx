import { MapPin } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import Reveal from "@/components/ui/Reveal";

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
    <section className="section-py bg-brand-gray-light">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} />
        <h2 className="text-section mb-6 max-w-2xl font-poppins font-bold text-brand-navy">
          {t.headline}
        </h2>
        <p className="mb-10 max-w-2xl font-inter text-lg leading-relaxed text-brand-navy-dark/90">
          {t.desc}
        </p>
        <div className="flex flex-wrap gap-3">
          {areas.map((area, i) => (
            <Reveal key={area} delay={i * 50}>
              <div className="flex items-center gap-2 rounded-full border border-brand-green/30 bg-white px-4 py-2 shadow-sm transition-colors duration-200 hover:border-brand-green hover:bg-brand-green-pale">
                <MapPin size={14} className="shrink-0 text-brand-green" />
                <span className="font-inter text-sm font-medium text-brand-navy-dark">{area}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
