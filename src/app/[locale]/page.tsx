import { getMessages } from "next-intl/server";
import Hero from "@/components/home/Hero";
import WhyUs from "@/components/home/WhyUs";
import ServicesOverview from "@/components/home/ServicesOverview";
import ServiceArea from "@/components/home/ServiceArea";
import SectionLabel from "@/components/ui/SectionLabel";
import BookingForm from "@/components/book/BookingForm";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, unknown>>;

  const hero = messages.hero ?? {};
  const whyUs = messages.whyUs ?? {};
  const services = messages.services ?? {};
  const serviceArea = messages.serviceArea ?? {};
  const book = messages.book ?? {};

  return (
    <>
      <Hero
        locale={locale}
        headline={(hero.headline as string) ?? "Your Home, Professionally Clean."}
        subheadline={(hero.subheadline as string) ?? ""}
        ctaPrimary={(hero.cta_primary as string) ?? "Book a Free Visit →"}
        ctaSecondary={(hero.cta_secondary as string) ?? "View Services"}
      />
      <WhyUs t={whyUs as Parameters<typeof WhyUs>[0]["t"]} />
      <ServicesOverview locale={locale} t={services as Parameters<typeof ServicesOverview>[0]["t"]} />
      <ServiceArea t={serviceArea as Parameters<typeof ServiceArea>[0]["t"]} />
      <section className="py-20 bg-brand-gray-light">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel text={(book.label as string) ?? "GET STARTED"} />
          <h2 className="font-poppins font-bold text-4xl sm:text-5xl text-brand-navy mb-4">
            {(book.headline as string) ?? "Request Your Free Visit"}
          </h2>
          <p className="font-inter text-brand-navy-dark text-lg mb-10">
            Fill out the form below and we&apos;ll call you within 24 hours to confirm.
          </p>
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <BookingForm t={book as Parameters<typeof BookingForm>[0]["t"]} />
          </div>
        </div>
      </section>
    </>
  );
}
