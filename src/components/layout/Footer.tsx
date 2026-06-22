import Link from "next/link";
import { Phone, MapPin } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

interface FooterProps {
  locale: string;
  t: {
    tagline: string;
    copyright: string;
    location: string;
  };
  navLabels: {
    home: string;
    services: string;
    about: string;
    contact: string;
  };
}

export default function Footer({ locale, t, navLabels }: FooterProps) {
  return (
    <footer className="bg-brand-navy">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5">
          {/* Logo */}
          <BrandLogo heightClass="h-12" textClass="text-xl" />

          {/* Phone */}
          <a
            href="tel:+19159795151"
            className="flex items-center gap-2 font-poppins text-lg font-bold text-brand-green-light transition-colors hover:text-white"
          >
            <Phone size={18} />
            (915) 979-5151
          </a>

          {/* Service area */}
          <p className="flex items-center gap-1.5 font-inter text-sm text-white/70">
            <MapPin size={14} className="text-brand-green-light" />
            {t.location}
          </p>

          {/* Tagline */}
          <p className="font-poppins text-sm font-bold uppercase tracking-[0.18em] text-brand-green-light">
            {t.tagline}
          </p>

          {/* Nav links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3">
            {[
              { href: `/${locale}`, label: navLabels.home },
              { href: `/${locale}/services`, label: navLabels.services },
              { href: `/${locale}/about`, label: navLabels.about },
              { href: `/${locale}/contact`, label: navLabels.contact },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-inter text-sm text-white/70 transition-colors hover:text-brand-green-light"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="h-px w-full max-w-xs bg-white/10" />

          <p className="font-inter text-xs text-white/50">{t.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
