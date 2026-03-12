import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import "@/app/globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Comfy Clean Co. | Far East El Paso Cleaning Service",
  description:
    "Professional residential and commercial cleaning in Far East El Paso, TX. Book a free visit today.",
};

const locales = ["en", "es"];

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;

  if (!locales.includes(locale)) notFound();

  const messages = await getMessages({ locale });

  const nav = (messages as Record<string, Record<string, string>>).nav ?? {};
  const footer = (messages as Record<string, Record<string, string>>).footer ?? {};

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar
            locale={locale}
            navLabels={{
              home: nav.home ?? "Home",
              services: nav.services ?? "Services",
              about: nav.about ?? "About",
              book: nav.book ?? "Book Now",
              contact: nav.contact ?? "Contact",
            }}
          />
          <main>{children}</main>
          <Footer
            locale={locale}
            t={{
              tagline: footer.tagline ?? "Clean · Fresh · Reliable",
              copyright: footer.copyright ?? "© 2025 Comfy Clean Co.",
              location: footer.location ?? "Far East El Paso, TX",
            }}
            navLabels={{
              home: nav.home ?? "Home",
              services: nav.services ?? "Services",
              about: nav.about ?? "About",
              contact: nav.contact ?? "Contact",
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
