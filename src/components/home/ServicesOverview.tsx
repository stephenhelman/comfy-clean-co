"use client";

import { Home, Building2, CalendarCheck } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import Link from "next/link";

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
    <section className="py-24 bg-brand-charcoal">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} />
        <h2 className="font-montserrat font-black text-4xl sm:text-5xl text-brand-white mb-12">
          {t.headline}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((svc, i) => {
            const Icon = svc.icon;
            return (
              <div
                key={i}
                className="bg-brand-card border border-brand-border border-t-2 border-t-brand-blue rounded-lg p-6 hover:border-brand-blue transition-all duration-200"
                onMouseOver={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 0 20px #5BB8E820")
                }
                onMouseOut={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")
                }
              >
                <div className="mb-4">
                  <Icon size={32} className="text-brand-blue" />
                </div>
                <h3 className="font-montserrat font-bold text-xl text-brand-white mb-2">
                  {svc.title}
                </h3>
                <p className="font-inter text-sm text-brand-silver leading-relaxed mb-4">
                  {svc.desc}
                </p>
                <ul className="space-y-1">
                  {svc.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-brand-gray-light font-inter">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-blue flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={`/${locale}/services`}
            className="font-montserrat font-bold text-sm uppercase tracking-wider text-brand-blue hover:text-brand-blue-light transition-colors"
          >
            View All Services →
          </Link>
        </div>
      </div>
    </section>
  );
}
