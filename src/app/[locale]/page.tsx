import { getMessages } from "next-intl/server";
import Hero from "@/components/home/Hero";
import WhyUs from "@/components/home/WhyUs";
import ServicesOverview from "@/components/home/ServicesOverview";
import ServiceArea from "@/components/home/ServiceArea";
import CTABanner from "@/components/home/CTABanner";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, string>>;

  const hero = messages.hero ?? {};
  const whyUs = messages.whyUs ?? {};
  const services = messages.services ?? {};
  const serviceArea = messages.serviceArea ?? {};
  const cta = messages.cta ?? {};

  return (
    <>
      <Hero
        locale={locale}
        headline={hero.headline ?? "Your Home, Professionally Clean."}
        subheadline={hero.subheadline ?? ""}
        ctaPrimary={hero.cta_primary ?? "Book a Free Visit →"}
        ctaSecondary={hero.cta_secondary ?? "View Services"}
      />
      <WhyUs t={whyUs as Parameters<typeof WhyUs>[0]["t"]} />
      <ServicesOverview locale={locale} t={services as Parameters<typeof ServicesOverview>[0]["t"]} />
      <ServiceArea t={serviceArea as Parameters<typeof ServiceArea>[0]["t"]} />
      <CTABanner locale={locale} t={cta as Parameters<typeof CTABanner>[0]["t"]} />
    </>
  );
}
