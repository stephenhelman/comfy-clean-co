import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import BookingBand from "@/components/book/BookingBand";
import { localeAlternates } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Book a Cleaning",
    description:
      "Request a free visit from Comfy Clean Co in Far East El Paso, TX. Fill out the form and we'll confirm within 24 hours. Residential and commercial cleaning available.",
    alternates: localeAlternates(locale, "/book"),
  };
}

export default async function BookPage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, unknown>>;
  const t = messages.book ?? {};

  return (
    <div className="section-py min-h-screen bg-brand-gray-light">
      <BookingBand t={t as Parameters<typeof BookingBand>[0]["t"]} as="h1" />
    </div>
  );
}
