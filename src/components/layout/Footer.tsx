import Link from "next/link";
import { Phone, MapPin, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

interface FooterProps {
  locale: string;
  phone: { display: string; href: string };
  t: {
    tagline: string;
    copyright: string;
    location: string;
    licensed: string;
    insured: string;
    bonded: string;
  };
  navLabels: {
    home: string;
    services: string;
    about: string;
    reviews: string;
    gallery: string;
    contact: string;
  };
}

export default function Footer({ locale, phone, t, navLabels }: FooterProps) {
  const badges = [t.licensed, t.insured, t.bonded];

  return (
    <footer className="bg-brand-navy">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5">
          {/* Logo */}
          <BrandLogo heightClass="h-12" textClass="text-xl" />

          {/* Phone */}
          <a
            href={phone.href}
            className="flex items-center gap-2 font-poppins text-lg font-bold text-brand-green-light transition-colors hover:text-white"
          >
            <Phone size={18} />
            {phone.display}
          </a>

          {/* Service area */}
          <p className="flex items-center gap-1.5 font-inter text-sm text-white/70">
            <MapPin size={14} className="text-brand-green-light" />
            {t.location}
          </p>

          {/* Trust badges */}
          <ul className="flex flex-wrap items-center justify-center gap-2.5">
            {badges.map((badge) => (
              <li
                key={badge}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-poppins text-xs font-bold uppercase tracking-wider text-white/85"
              >
                <ShieldCheck size={13} className="text-brand-green-light" />
                {badge}
              </li>
            ))}
          </ul>

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
              { href: `/${locale}/reviews`, label: navLabels.reviews },
              { href: `/${locale}/gallery`, label: navLabels.gallery },
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
