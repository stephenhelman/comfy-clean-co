import Button from "@/components/ui/Button";

interface HeroProps {
  locale: string;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

export default function Hero({ locale, headline, subheadline, ctaPrimary, ctaSecondary }: HeroProps) {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "#0A0A0A" }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, #5BB8E810 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Logo */}
        <img
          src="/images/brand/logo-white.png"
          alt="Comfy Clean Co."
          className="mx-auto mb-8 h-44 sm:h-56 lg:h-72 w-auto"
        />

        {/* Section label */}
        <p className="font-montserrat font-bold text-xs uppercase tracking-widest text-brand-blue mb-6">
          Clean · Fresh · Reliable
        </p>

        {/* Headline */}
        <h1 className="font-montserrat font-black text-5xl sm:text-6xl lg:text-7xl text-brand-white leading-tight tracking-tight mb-6">
          {headline}
        </h1>

        {/* Subheadline */}
        <p className="font-inter text-lg sm:text-xl text-brand-silver max-w-2xl mx-auto mb-10 leading-relaxed">
          {subheadline}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button href={`/${locale}/book`} variant="primary">
            {ctaPrimary}
          </Button>
          <Button href={`/${locale}/services`} variant="ghost">
            {ctaSecondary}
          </Button>
        </div>
      </div>
    </section>
  );
}
