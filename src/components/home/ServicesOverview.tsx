import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import ServiceCard from "@/components/services/ServiceCard";
import Reveal from "@/components/ui/Reveal";
import { getFeaturedServices } from "@/lib/services";

interface ServicesOverviewProps {
  locale: string;
  t: {
    label: string;
    headline: string;
    viewAll: string;
  };
}

export default function ServicesOverview({ locale, t }: ServicesOverviewProps) {
  const featured = getFeaturedServices();

  return (
    <section className="section-py bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} />
        <h2 className="text-section mb-12 max-w-2xl font-poppins font-bold text-brand-navy">
          {t.headline}
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {featured.map((svc, i) => (
            <Reveal key={svc.slug} delay={i * 80} className="h-full">
              <ServiceCard service={svc} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={`/${locale}/services`}
            className="group inline-flex items-center gap-1.5 font-poppins text-sm font-bold uppercase tracking-wider text-brand-green-dark transition-colors hover:text-brand-green"
          >
            {t.viewAll}
            <ArrowRight
              size={15}
              className="transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
