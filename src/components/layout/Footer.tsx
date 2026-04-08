"use client";

import Link from "next/link";
import { Phone } from "lucide-react";

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <img
            src="/images/brand/logo-white.png"
            alt="Comfy Clean Co."
            className="h-12 w-auto"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />

          {/* Phone */}
          <a
            href="tel:+19159795151"
            className="flex items-center gap-2 font-poppins font-bold text-brand-green text-lg hover:text-brand-green-light transition-colors"
          >
            <Phone size={18} />
            (915) 979-5151
          </a>

          {/* Tagline */}
          <p className="font-poppins font-bold uppercase tracking-widest text-brand-green text-sm">
            {t.tagline}
          </p>

          {/* Nav links */}
          <nav className="flex flex-wrap justify-center gap-6">
            {[
              { href: `/${locale}`, label: navLabels.home },
              { href: `/${locale}/services`, label: navLabels.services },
              { href: `/${locale}/about`, label: navLabels.about },
              { href: `/${locale}/contact`, label: navLabels.contact },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-inter text-sm text-white/70 hover:text-brand-green transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="w-full h-px bg-white/10" />

          <p className="text-white/50 text-xs font-inter">{t.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
