import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { Phone, Mail, MapPin } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import Reveal from "@/components/ui/Reveal";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Comfy Clean Co in Far East El Paso, TX. Call, email, or fill out our contact form and we'll respond within 24 hours.",
  alternates: {
    canonical: "https://comfycleanco.com/contact",
  },
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, unknown>>;
  const t = messages.contact ?? {};

  const infoCards = [
    { icon: Phone, label: (t.phone_label as string) ?? "Phone", value: "915-979-5151", href: "tel:+19159795151" },
    { icon: Mail, label: (t.email_label as string) ?? "Email", value: "info@comfycleanco.com", href: "mailto:info@comfycleanco.com" },
    { icon: MapPin, label: (t.location_label as string) ?? "Service Area", value: (t.location_value as string) ?? "" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="section-py">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <SectionLabel text={(t.label as string) ?? "GET IN TOUCH"} />
          <h1 className="text-display mb-12 font-poppins font-bold text-brand-navy">
            {(t.headline as string) ?? "Contact Comfy Clean Co."}
          </h1>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {infoCards.map((card, i) => {
              const Icon = card.icon;
              const body = (
                <>
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green-pale">
                    <Icon size={20} className="text-brand-green" />
                  </div>
                  <p className="mb-1 font-poppins text-xs font-bold uppercase tracking-wider text-brand-navy">
                    {card.label}
                  </p>
                  <p className="font-inter text-brand-navy-dark">{card.value}</p>
                </>
              );
              return (
                <Reveal key={i} delay={i * 70} className="h-full">
                  {card.href ? (
                    <a
                      href={card.href}
                      className="group block h-full rounded-2xl border border-gray-200/80 bg-brand-off-white p-6 transition-[transform,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-navy/5"
                    >
                      {body}
                    </a>
                  ) : (
                    <div className="h-full rounded-2xl border border-gray-200/80 bg-brand-off-white p-6">
                      {body}
                    </div>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
      <div className="section-py bg-brand-gray-light">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionLabel text="SEND A MESSAGE" />
          <h2 className="text-section mb-4 font-poppins font-bold text-brand-navy">
            Get in Touch
          </h2>
          <p className="mb-10 max-w-prose font-inter text-lg text-brand-navy-dark/90">
            Fill out the form and we&apos;ll get back to you within 24 hours.
          </p>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
