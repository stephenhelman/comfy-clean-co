import { Home, Building2, CalendarCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import SectionLabel from "@/components/ui/SectionLabel";
import Card from "@/components/ui/Card";
import Reveal from "@/components/ui/Reveal";

interface ServicesOverviewProps {
  locale: string;
  t: {
    label: string;
    headline: string;
    residential_title: string;
    residential_desc: string;
    commercial_title: string;
    commercial_desc: string;
    recurring_title: string;
    recurring_desc: string;
  };
}

export default function ServicesOverview({ locale, t }: ServicesOverviewProps) {
  const services = [
    {
      icon: Home,
      title: t.residential_title,
      desc: t.residential_desc,
      features: ["Deep Clean", "Standard Clean", "Move-in/Move-out"],
    },
    {
      icon: Building2,
      title: t.commercial_title,
      desc: t.commercial_desc,
      features: ["Offices", "Retail Spaces", "Small Commercial"],
    },
    {
      icon: CalendarCheck,
      title: t.recurring_title,
      desc: t.recurring_desc,
      features: ["Weekly", "Bi-weekly", "Monthly"],
    },
  ];

  return (
    <section className="section-py bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} />
        <h2 className="text-section mb-12 max-w-2xl font-poppins font-bold text-brand-navy">
          {t.headline}
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {services.map((svc, i) => (
            <Reveal key={i} delay={i * 80} className="h-full">
              <Card icon={svc.icon} title={svc.title} desc={svc.desc} features={svc.features} />
            </Reveal>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={`/${locale}/services`}
            className="group inline-flex items-center gap-1.5 font-poppins text-sm font-bold uppercase tracking-wider text-brand-green-dark transition-colors hover:text-brand-green"
          >
            View All Services
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
