"use client";

import Link from "next/link";

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
    <footer className="bg-brand-charcoal border-t border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <img
            src="/images/brand/logo-white.png"
            alt="Comfy Clean Co."
            className="h-10 w-auto"
            onError={(e) => {
              const el = e.currentTarget as HTMLImageElement;
              el.style.display = "none";
            }}
          />

          {/* Brand name fallback */}
          <span className="font-montserrat font-black text-brand-white text-xl">
            Comfy Clean Co.
          </span>

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
                className="font-inter text-sm text-brand-silver hover:text-brand-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Tagline */}
          <p className="font-montserrat font-bold uppercase tracking-widest text-brand-blue text-sm">
            {t.tagline}
          </p>

          {/* Divider */}
          <div className="w-full h-px bg-brand-border" />

          {/* Copyright */}
          <p className="text-brand-silver text-xs font-inter">
            {t.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
