import { getMessages } from "next-intl/server";
import SectionLabel from "@/components/ui/SectionLabel";
import ServiceCard from "@/components/services/ServiceCard";
import Button from "@/components/ui/Button";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, string>>;
  const t = messages.services ?? {};

  const items = [
    {
      icon: "Home" as const,
      title: t.residential_title ?? "Residential Cleaning",
      desc: t.residential_desc ?? "",
      features: ["Deep Clean", "Standard Clean", "Move-in / Move-out", "Post-construction"],
    },
    {
      icon: "Building2" as const,
      title: t.commercial_title ?? "Commercial Cleaning",
      desc: t.commercial_desc ?? "",
      features: ["Office Buildings", "Retail Spaces", "Small Commercial", "After-hours available"],
    },
    {
      icon: "CalendarCheck" as const,
      title: t.recurring_title ?? "Recurring Plans",
      desc: t.recurring_desc ?? "",
      features: ["Weekly", "Bi-weekly", "Monthly", "Custom schedules"],
    },
  ];

  return (
    <div className="min-h-screen bg-white py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label ?? "WHAT WE OFFER"} />
        <h1 className="font-poppins font-bold text-5xl text-brand-navy mb-4">
          {t.headline ?? "Our Cleaning Services"}
        </h1>
        <p className="font-inter text-brand-navy-dark text-lg max-w-2xl mb-12">
          Professional residential and commercial cleaning tailored to your needs. Every service includes our reliability guarantee — we show up on time or your next visit is free.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {items.map((item, i) => (
            <ServiceCard key={i} {...item} />
          ))}
        </div>
        <div className="text-center">
          <Button href={`/${locale}/book`} variant="primary">
            {locale === "es" ? "Reserva una Visita Gratis →" : "Book a Free Visit →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
