import SectionLabel from "@/components/ui/SectionLabel";
import BookingForm from "@/components/book/BookingForm";

interface BookingBandProps {
  t: Parameters<typeof BookingForm>[0]["t"] & { label?: string; headline?: string };
  /** Heading level — h1 on the dedicated Book page, h2 when embedded below content. */
  as?: "h1" | "h2";
  /** Lead source tag for this placement (e.g. "book", "home", "services-page"). */
  source?: string;
}

/**
 * The repeated "request a free visit" intro + form, shared across the Home,
 * Services, About, and Book pages. Copy is intentionally verbatim (structural
 * dedupe only). Pages provide their own section wrapper / background.
 */
export default function BookingBand({ t, as = "h2", source = "book" }: BookingBandProps) {
  const Heading = as;
  const headingScale = as === "h1" ? "text-display" : "text-section";
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <SectionLabel text={t.label ?? "GET STARTED"} />
      <Heading className={`${headingScale} mb-4 font-poppins font-bold text-brand-navy`}>
        {t.headline ?? "Request Your Free Visit"}
      </Heading>
      <p className="mb-10 max-w-prose font-inter text-lg text-brand-navy-dark/90">
        Fill out the form below and we&apos;ll call you within 24 hours to confirm.
      </p>
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <BookingForm t={t} source={source} />
      </div>
    </div>
  );
}
