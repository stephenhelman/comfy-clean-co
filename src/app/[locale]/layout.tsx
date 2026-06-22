import { notFound } from "next/navigation";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Poppins, Inter } from "next/font/google";
import "@/app/globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { getBusinessPhone } from "@/lib/businessData";
import { formatPhone, phoneHref } from "@/lib/businessInfo";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-poppins-sans",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter-sans",
  display: "swap",
});

const locales = ["en", "es"];

// Adds `.js` to <html> before paint so scroll-reveal hidden states only apply
// when JS is present (no-JS / pre-hydration renders stay visible).
const jsClassScript = `document.documentElement.classList.add('js')`;

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

  const rawPhone = await getBusinessPhone();
  const phone = { display: formatPhone(rawPhone), href: phoneHref(rawPhone) };

  return (
    <html lang={locale} className={`${poppins.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: jsClassScript }} />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Navbar
            locale={locale}
            phone={phone}
            navLabels={{
              home: nav.home ?? "Home",
              services: nav.services ?? "Services",
              about: nav.about ?? "About",
              reviews: nav.reviews ?? "Reviews",
              gallery: nav.gallery ?? "Gallery",
              book: nav.book ?? "Book Now",
              contact: nav.contact ?? "Contact",
            }}
          />
          <main>{children}</main>
          <Footer
            locale={locale}
            phone={phone}
            t={{
              tagline: footer.tagline ?? "Clean · Fresh · Reliable",
              copyright: footer.copyright ?? "© 2025 Comfy Clean Co.",
              location: footer.location ?? "Far East El Paso, TX",
              licensed: footer.licensed ?? "Licensed",
              insured: footer.insured ?? "Insured",
              bonded: footer.bonded ?? "Bonded",
            }}
            navLabels={{
              home: nav.home ?? "Home",
              services: nav.services ?? "Services",
              about: nav.about ?? "About",
              reviews: nav.reviews ?? "Reviews",
              gallery: nav.gallery ?? "Gallery",
              contact: nav.contact ?? "Contact",
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
