"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";

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
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const links = [
    { href: `/${locale}`, label: navLabels.home },
    { href: `/${locale}/services`, label: navLabels.services },
    { href: `/${locale}/about`, label: navLabels.about },
    { href: `/${locale}/contact`, label: navLabels.contact },
  ];

  return (
    <header className="sticky top-0 z-50 bg-brand-navy shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <img
              src="/images/brand/logo-white.png"
              alt="Comfy Clean Co."
              className="h-9 w-auto"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Phone */}
            <a
              href="tel:+19159795151"
              className="flex items-center gap-1.5 font-poppins font-bold text-white text-sm hover:text-brand-green-light transition-colors"
            >
              <Phone size={15} />
              (915) 979-5151
            </a>

            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-inter text-sm text-white/80 hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Language toggle */}
            <Link
              href={otherLocalePath}
              className="font-poppins font-bold text-xs uppercase tracking-wider text-white/60 hover:text-white transition-colors"
            >
              {otherLocale === "en" ? "EN" : "ES"}
            </Link>

            {/* Book CTA */}
            <Link
              href={`/${locale}/book`}
              className="bg-brand-green hover:bg-brand-green-dark text-white font-poppins font-bold text-sm uppercase tracking-wider px-4 py-2 rounded-md transition-colors"
            >
              {navLabels.book}
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-brand-navy-dark border-t border-white/10 px-4 py-4 flex flex-col gap-4">
          <a
            href="tel:+19159795151"
            className="flex items-center gap-2 font-poppins font-bold text-brand-green text-sm"
          >
            <Phone size={15} />
            (915) 979-5151
          </a>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-inter text-white/80 hover:text-white transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-4 pt-2 border-t border-white/10">
            <Link
              href={otherLocalePath}
              className="font-poppins font-bold text-xs uppercase tracking-wider text-white/60"
              onClick={() => setMobileOpen(false)}
            >
              {otherLocale === "en" ? "EN" : "ES"}
            </Link>
            <Link
              href={`/${locale}/book`}
              className="flex-1 text-center bg-brand-green hover:bg-brand-green-dark text-white font-poppins font-bold text-sm uppercase tracking-wider px-4 py-2 rounded-md transition-colors"
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
