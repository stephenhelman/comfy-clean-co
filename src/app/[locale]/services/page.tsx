import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import SectionLabel from "@/components/ui/SectionLabel";
import ServiceCard from "@/components/services/ServiceCard";
import Reveal from "@/components/ui/Reveal";
import BookingBand from "@/components/book/BookingBand";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore Comfy Clean Co's residential and commercial cleaning services in Far East El Paso, TX. Deep cleans, recurring plans, move-out cleaning, and more.",
  alternates: {
    canonical: "https://comfycleanco.com/services",
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, unknown>>;
  const t = messages.services ?? {};
  const book = messages.book ?? {};

  const items = [
    {
      icon: "Home" as const,
      title: (t.residential_title as string) ?? "Residential Cleaning",
      desc: (t.residential_desc as string) ?? "",
      features: ["Deep Clean", "Standard Clean", "Move-in / Move-out", "Post-construction"],
    },
    {
      icon: "Building2" as const,
      title: (t.commercial_title as string) ?? "Commercial Cleaning",
      desc: (t.commercial_desc as string) ?? "",
      features: ["Office Buildings", "Retail Spaces", "Small Commercial", "After-hours available"],
    },
    {
      icon: "CalendarCheck" as const,
      title: (t.recurring_title as string) ?? "Recurring Plans",
      desc: (t.recurring_desc as string) ?? "",
      features: ["Weekly", "Bi-weekly", "Monthly", "Custom schedules"],
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="section-py">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionLabel text={(t.label as string) ?? "WHAT WE OFFER"} />
          <h1 className="text-display mb-4 font-poppins font-bold text-brand-navy">
            {(t.headline as string) ?? "Our Cleaning Services"}
          </h1>
          <p className="mb-12 max-w-2xl font-inter text-lg leading-relaxed text-brand-navy-dark/90">
            Professional residential and commercial cleaning tailored to your needs. Every service includes our reliability guarantee — we show up on time or your next visit is free.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {items.map((item, i) => (
              <Reveal key={i} delay={i * 80} className="h-full">
                <ServiceCard {...item} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
      <div className="section-py bg-brand-gray-light">
        <BookingBand t={book as Parameters<typeof BookingBand>[0]["t"]} />
      </div>
    </div>
  );
}
