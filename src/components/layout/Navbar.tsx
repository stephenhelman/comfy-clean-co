"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  locale: string;
  navLabels: {
    home: string;
    services: string;
    about: string;
    book: string;
    contact: string;
  };
}

export default function Navbar({ locale, navLabels }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const otherLocale = locale === "en" ? "es" : "en";

  // Build the same path in the other locale
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const links = [
    { href: `/${locale}`, label: navLabels.home },
    { href: `/${locale}/services`, label: navLabels.services },
    { href: `/${locale}/about`, label: navLabels.about },
    { href: `/${locale}/contact`, label: navLabels.contact },
  ];

  return (
    <header className="sticky top-0 z-50 bg-brand-black border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <img
              src="/images/brand/logo.png"
              alt="Comfy Clean Co."
              className="h-8 w-auto"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="font-montserrat font-black text-brand-white text-lg hidden sm:block">
              Comfy Clean Co.
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-inter text-sm text-brand-silver hover:text-brand-white transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Language toggle */}
            <Link
              href={otherLocalePath}
              className="font-montserrat font-bold text-xs uppercase tracking-wider text-brand-gray-mid hover:text-brand-silver transition-colors"
            >
              {otherLocale === "en" ? "EN" : "ES"}
            </Link>

            {/* Book CTA */}
            <Link
              href={`/${locale}/book`}
              className="bg-brand-blue text-brand-black font-montserrat font-bold text-sm uppercase tracking-wider px-4 py-2 rounded hover:bg-brand-blue-light transition-colors"
            >
              {navLabels.book}
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-brand-silver p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-brand-charcoal border-t border-brand-border px-4 py-4 flex flex-col gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-inter text-brand-silver hover:text-brand-white transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-4 pt-2 border-t border-brand-border">
            <Link
              href={otherLocalePath}
              className="font-montserrat font-bold text-xs uppercase tracking-wider text-brand-gray-mid"
              onClick={() => setMobileOpen(false)}
            >
              {otherLocale === "en" ? "EN" : "ES"}
            </Link>
            <Link
              href={`/${locale}/book`}
              className="flex-1 text-center bg-brand-blue text-brand-black font-montserrat font-bold text-sm uppercase tracking-wider px-4 py-2 rounded hover:bg-brand-blue-light transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {navLabels.book}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
