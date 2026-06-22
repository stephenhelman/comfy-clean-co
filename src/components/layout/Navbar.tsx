"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Phone } from "lucide-react";
import BrandLogo from "@/components/ui/BrandLogo";

interface NavbarProps {
  locale: string;
  phone: { display: string; href: string };
  navLabels: {
    home: string;
    services: string;
    about: string;
    reviews: string;
    gallery: string;
    book: string;
    contact: string;
  };
}

export default function Navbar({ locale, phone, navLabels }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const otherLocale = locale === "en" ? "es" : "en";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const links = [
    { href: `/${locale}`, label: navLabels.home },
    { href: `/${locale}/services`, label: navLabels.services },
    { href: `/${locale}/about`, label: navLabels.about },
    { href: `/${locale}/reviews`, label: navLabels.reviews },
    { href: `/${locale}/gallery`, label: navLabels.gallery },
    { href: `/${locale}/contact`, label: navLabels.contact },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-navy/95 shadow-md backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <BrandLogo heightClass="h-9" textClass="text-base sm:text-lg" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-5 lg:flex">
            <a
              href={phone.href}
              className="flex items-center gap-1.5 font-poppins text-sm font-bold text-white transition-colors hover:text-brand-green-light"
            >
              <Phone size={15} />
              {phone.display}
            </a>

            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-inter text-sm text-white/80 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}

            {/* Language toggle */}
            <Link
              href={otherLocalePath}
              className="font-poppins text-xs font-bold uppercase tracking-wider text-white/60 transition-colors hover:text-white"
            >
              {otherLocale === "en" ? "EN" : "ES"}
            </Link>

            {/* Book CTA */}
            <Link
              href={`/${locale}/book`}
              className="press rounded-lg bg-brand-green px-4 py-2 font-poppins text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-green-dark"
            >
              {navLabels.book}
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="relative p-2 text-white lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <Menu
              size={24}
              className={`transition-all duration-200 ease-out-quart ${mobileOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"}`}
            />
            <X
              size={24}
              className={`absolute inset-0 m-auto transition-all duration-200 ease-out-quart ${mobileOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile menu — animated dropdown (transform + opacity, no layout jank) */}
      <div
        id="mobile-menu"
        className={`origin-top overflow-hidden border-t border-white/10 bg-brand-navy-dark transition-[opacity,transform] duration-200 ease-out-quart lg:hidden ${
          mobileOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div className="flex flex-col gap-4 px-4 py-4">
          <a
            href={phone.href}
            className="flex items-center gap-2 font-poppins text-sm font-bold text-brand-green-light"
          >
            <Phone size={15} />
            {phone.display}
          </a>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-inter text-white/80 transition-colors hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-4 border-t border-white/10 pt-2">
            <Link
              href={otherLocalePath}
              className="font-poppins text-xs font-bold uppercase tracking-wider text-white/60"
              onClick={() => setMobileOpen(false)}
            >
              {otherLocale === "en" ? "EN" : "ES"}
            </Link>
            <Link
              href={`/${locale}/book`}
              className="press flex-1 rounded-lg bg-brand-green px-4 py-2 text-center font-poppins text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-green-dark"
              onClick={() => setMobileOpen(false)}
            >
              {navLabels.book}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
