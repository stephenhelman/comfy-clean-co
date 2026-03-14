import Link from "next/link";

interface CTABannerProps {
  locale: string;
  t: {
    headline: string;
    desc: string;
    button: string;
  };
}

export default function CTABanner({ locale, t }: CTABannerProps) {
  return (
    <section className="py-20 bg-brand-navy">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-poppins font-bold text-4xl sm:text-5xl text-white mb-4">
          {t.headline}
        </h2>
        <p className="font-inter text-white/80 text-lg mb-8">{t.desc}</p>
        <Link
          href={`/${locale}/book`}
          className="inline-flex items-center justify-center bg-brand-green hover:bg-brand-green-dark text-white font-poppins font-bold uppercase tracking-wider px-8 py-4 rounded-md transition-colors text-sm"
        >
          {t.button}
        </Link>
      </div>
    </section>
  );
}
