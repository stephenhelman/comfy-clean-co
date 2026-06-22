import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import SectionLabel from "@/components/ui/SectionLabel";
import ServicesTabs from "@/components/services/ServicesTabs";
import BookingBand from "@/components/book/BookingBand";
import { localeAlternates } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Services",
    description:
      "Explore Comfy Clean Co's residential and commercial cleaning services in Far East El Paso, TX. Deep cleans, recurring plans, move-out cleaning, and more.",
    alternates: localeAlternates(locale, "/services"),
  };
}

export default async function ServicesPage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, unknown>>;
  const t = messages.services ?? {};
  const book = messages.book ?? {};

  return (
    <div className="min-h-screen bg-white">
      <div className="section-py">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionLabel text={(t.label as string) ?? "WHAT WE OFFER"} />
          <h1 className="text-display mb-4 font-poppins font-bold text-brand-navy">
            {(t.headline as string) ?? "Our Cleaning Services"}
          </h1>
          <p className="mb-12 max-w-2xl font-inter text-lg leading-relaxed text-brand-navy-dark/90">
            {(t.intro as string) ?? "Professional residential and commercial cleaning tailored to your needs. Every service includes our reliability guarantee — we show up on time or your next visit is free."}
          </p>
          <ServicesTabs />
        </div>
      </div>
      <div className="section-py bg-brand-gray-light">
        <BookingBand t={book as Parameters<typeof BookingBand>[0]["t"]} source="services-page" />
      </div>
    </div>
  );
}
