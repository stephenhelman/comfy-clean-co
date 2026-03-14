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
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} />
        <h2 className="font-poppins font-bold text-4xl sm:text-5xl text-brand-navy mb-12">
          {t.headline}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((svc, i) => {
            const Icon = svc.icon;
            return (
              <div
                key={i}
                className="bg-brand-off-white border border-gray-200 border-t-4 border-t-brand-green rounded-xl p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-brand-green-pale flex items-center justify-center mb-4">
                  <Icon size={24} className="text-brand-green" />
                </div>
                <h3 className="font-poppins font-bold text-xl text-brand-navy mb-2">
                  {svc.title}
                </h3>
                <p className="font-inter text-sm text-brand-navy-dark leading-relaxed mb-4">
                  {svc.desc}
                </p>
                <ul className="space-y-1">
                  {svc.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-brand-navy-dark font-inter">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-green shrink-0" />
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
            className="font-poppins font-bold text-sm uppercase tracking-wider text-brand-green hover:text-brand-green-dark transition-colors"
          >
            View All Services →
          </Link>
        </div>
      </div>
    </section>
  );
}
