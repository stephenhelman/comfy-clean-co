import Button from "@/components/ui/Button";

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
    <section className="py-24 bg-brand-charcoal">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-montserrat font-black text-4xl sm:text-5xl text-brand-white mb-4">
          {t.headline}
        </h2>
        <p className="font-inter text-brand-silver text-lg mb-8">{t.desc}</p>
        <Button href={`/${locale}/book`} variant="primary">
          {t.button}
        </Button>
      </div>
    </section>
  );
}
