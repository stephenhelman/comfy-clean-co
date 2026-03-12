import { getMessages } from "next-intl/server";
import SectionLabel from "@/components/ui/SectionLabel";
import BookingForm from "@/components/book/BookingForm";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function BookPage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, unknown>>;
  const t = messages.book ?? {};

  return (
    <div className="min-h-screen bg-brand-black py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={(t.label as string) ?? "GET STARTED"} />
        <h1 className="font-montserrat font-black text-5xl text-brand-white mb-4">
          {(t.headline as string) ?? "Request Your Free Visit"}
        </h1>
        <p className="font-inter text-brand-silver text-lg mb-10">
          Fill out the form below and we&apos;ll call you within 24 hours to confirm.
        </p>
        <div className="bg-brand-card border border-brand-border rounded-lg p-6 sm:p-8">
          <BookingForm t={t as Parameters<typeof BookingForm>[0]["t"]} />
        </div>
      </div>
    </div>
  );
}
