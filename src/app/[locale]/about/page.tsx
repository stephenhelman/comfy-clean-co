import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import SectionLabel from "@/components/ui/SectionLabel";
import BookingForm from "@/components/book/BookingForm";

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
      <div className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel text={(t.label as string) ?? "OUR STORY"} />
          <h1 className="font-poppins font-bold text-5xl text-brand-navy mb-8">
            {(t.headline as string) ?? "About Comfy Clean Co."}
          </h1>
          <div className="space-y-6">
            <p className="font-inter text-brand-navy-dark text-lg leading-relaxed">{t.p1 as string}</p>
            <p className="font-inter text-brand-navy-dark text-lg leading-relaxed">{t.p2 as string}</p>
            <p className="font-inter text-xl font-bold text-brand-navy leading-relaxed">{t.p3 as string}</p>
          </div>
        </div>
      </div>
      <div className="bg-brand-gray-light py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel text={(book.label as string) ?? "GET STARTED"} />
          <h2 className="font-poppins font-bold text-4xl text-brand-navy mb-4">
            {(book.headline as string) ?? "Request Your Free Visit"}
          </h2>
          <p className="font-inter text-brand-navy-dark text-lg mb-10">
            Fill out the form below and we&apos;ll call you within 24 hours to confirm.
          </p>
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <BookingForm t={book as Parameters<typeof BookingForm>[0]["t"]} />
          </div>
        </div>
      </div>
    </div>
  );
}
