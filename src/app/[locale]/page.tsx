import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import Hero from "@/components/home/Hero";
import WhyUs from "@/components/home/WhyUs";
import ServicesOverview from "@/components/home/ServicesOverview";
import ServiceArea from "@/components/home/ServiceArea";
import WaveDivider from "@/components/ui/WaveDivider";
import BookingBand from "@/components/book/BookingBand";
import { getBusinessPhone } from "@/lib/businessData";
import { phoneHref } from "@/lib/businessInfo";
import { SERVICE_AREA_CITIES } from "@/lib/businessInfo";
import { localeAlternates } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Comfy Clean Co | Professional Cleaning Services in El Paso, TX",
    description:
      "Professional residential and commercial cleaning in Far East El Paso, TX. Trusted house cleaning, deep clean, move-out, and commercial services. Book today.",
    alternates: localeAlternates(locale, ""),
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, unknown>>;

  const hero = messages.hero ?? {};
  const whyUs = messages.whyUs ?? {};
  const services = messages.services ?? {};
  const serviceArea = messages.serviceArea ?? {};
  const book = messages.book ?? {};

  const rawPhone = await getBusinessPhone();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "CleaningService"],
    name: "Comfy Clean Co",
    url: "https://comfycleanco.com",
    telephone: phoneHref(rawPhone).replace("tel:", ""),
    email: "info@comfycleanco.com",
    description:
      "Professional residential and commercial cleaning in Far East El Paso, TX. Trusted house cleaning, deep clean, move-out, and commercial services. Book today.",
    areaServed: [...SERVICE_AREA_CITIES, "El Paso", "TX"],
    address: {
      "@type": "PostalAddress",
      addressLocality: "El Paso",
      addressRegion: "TX",
      addressCountry: "US",
    },
    priceRange: "$$",
    openingHours: ["Mo-Sa 08:00-18:00"],
    // FLAG: no social URLs provided yet — leave empty (do not invent). Fill when available.
    sameAs: [] as string[],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero
        locale={locale}
        headline={(hero.headline as string) ?? "Your Home, Professionally Clean."}
        subheadline={(hero.subheadline as string) ?? ""}
        ctaPrimary={(hero.cta_primary as string) ?? "Book a Free Visit →"}
        ctaSecondary={(hero.cta_secondary as string) ?? "View Services"}
      />
      <WhyUs t={whyUs as Parameters<typeof WhyUs>[0]["t"]} />
      {/* Wave motif — green band drips back into the white Services section */}
      <WaveDivider fill="var(--color-brand-green)" flip className="-mt-px" />
      <ServicesOverview locale={locale} t={services as Parameters<typeof ServicesOverview>[0]["t"]} />
      <ServiceArea t={serviceArea as Parameters<typeof ServiceArea>[0]["t"]} />
      <section className="section-py bg-brand-gray-light">
        <BookingBand t={book as Parameters<typeof BookingBand>[0]["t"]} source="home" />
      </section>
    </>
  );
}
