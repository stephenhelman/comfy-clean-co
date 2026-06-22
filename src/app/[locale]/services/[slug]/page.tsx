import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages, getTranslations } from "next-intl/server";
import { Check } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import BookingForm from "@/components/book/BookingForm";
import { getServices, getServiceBySlug } from "@/lib/services";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  return getServices().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!getServiceBySlug(slug)) return {};
  const t = await getTranslations({ locale, namespace: "services.items" });
  return {
    title: t(`${slug}.title`),
    alternates: { canonical: `https://comfycleanco.com/services/${slug}` },
  };
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const t = await getTranslations({ locale, namespace: "services.items" });
  const messages = (await getMessages({ locale })) as Record<string, Record<string, unknown>>;
  const book = messages.book ?? {};
  const features = (t.raw(`${slug}.features`) as string[] | undefined) ?? [];

  return (
    <div className="section-py min-h-screen bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        {/* Service detail */}
        <div>
          <SectionLabel text={service.division === "commercial" ? "COMMERCIAL" : "RESIDENTIAL"} />
          <h1 className="text-display mb-5 font-poppins font-bold text-brand-navy">
            {t(`${slug}.title`)}
          </h1>
          <p className="mb-8 max-w-prose font-inter text-lg leading-relaxed text-brand-navy-dark/90">
            {t(`${slug}.desc`)}
          </p>
          {features.length > 0 && (
            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3 font-inter text-brand-navy-dark">
                  <Check size={18} className="mt-0.5 shrink-0 text-brand-green" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Order form, preset + locked to this service */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-section mb-2 font-poppins font-bold text-brand-navy">
            {(book.headline as string) ?? "Request Your Free Visit"}
          </h2>
          <p className="mb-8 font-inter text-brand-navy-dark/90">
            Fill out the form below and we&apos;ll call you within 24 hours to confirm.
          </p>
          <BookingForm
            t={book as Parameters<typeof BookingForm>[0]["t"]}
            presetService={slug}
            presetDivision={service.division}
            lockService
            source={`services/${slug}`}
          />
        </div>
      </div>
    </div>
  );
}
