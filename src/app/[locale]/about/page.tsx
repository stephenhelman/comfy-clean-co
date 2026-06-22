import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import SectionLabel from "@/components/ui/SectionLabel";
import Reveal from "@/components/ui/Reveal";
import BookingBand from "@/components/book/BookingBand";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Comfy Clean Co, a family-run cleaning company serving Far East El Paso, TX with reliable, professional residential and commercial cleaning.",
  alternates: {
    canonical: "https://comfycleanco.com/about",
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, unknown>>;
  const t = messages.about ?? {};
  const book = messages.book ?? {};

  return (
    <div className="min-h-screen bg-white">
      <div className="section-py">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionLabel text={(t.label as string) ?? "OUR STORY"} />
          <h1 className="text-display mb-8 font-poppins font-bold text-brand-navy">
            {(t.headline as string) ?? "About Comfy Clean Co."}
          </h1>
          <div className="space-y-6">
            <p className="font-inter text-lg leading-relaxed text-brand-navy-dark/90">{t.p1 as string}</p>
            <p className="font-inter text-lg leading-relaxed text-brand-navy-dark/90">{t.p2 as string}</p>
            {/* Closing line, set apart with a soft brand tint rather than just bolder text */}
            <Reveal>
              <p className="rounded-2xl bg-brand-green-pale px-6 py-5 font-poppins text-xl font-bold leading-relaxed text-brand-navy">
                {t.p3 as string}
              </p>
            </Reveal>
          </div>
        </div>
      </div>
      <div className="section-py bg-brand-gray-light">
        <BookingBand t={book as Parameters<typeof BookingBand>[0]["t"]} source="about" />
      </div>
    </div>
  );
}
