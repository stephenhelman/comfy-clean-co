import type { Metadata } from "next";
import { getMessages } from "next-intl/server";
import { Phone, Mail, MapPin } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
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

  return (
    <div className="min-h-screen bg-white">
      <div className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel text={(t.label as string) ?? "GET IN TOUCH"} />
          <h1 className="font-poppins font-bold text-5xl text-brand-navy mb-12">
            {(t.headline as string) ?? "Contact Comfy Clean Co."}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-brand-off-white border border-gray-200 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-brand-green-pale flex items-center justify-center mb-3">
                <Phone size={20} className="text-brand-green" />
              </div>
              <p className="font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-1">
                {(t.phone_label as string) ?? "Phone"}
              </p>
              <p className="font-inter text-brand-navy-dark">915-979-5151</p>
            </div>

            <div className="bg-brand-off-white border border-gray-200 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-brand-green-pale flex items-center justify-center mb-3">
                <Mail size={20} className="text-brand-green" />
              </div>
              <p className="font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-1">
                {(t.email_label as string) ?? "Email"}
              </p>
              <p className="font-inter text-brand-navy-dark">info@comfycleanco.com</p>
            </div>

            <div className="bg-brand-off-white border border-gray-200 rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-brand-green-pale flex items-center justify-center mb-3">
                <MapPin size={20} className="text-brand-green" />
              </div>
              <p className="font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-1">
                {(t.location_label as string) ?? "Service Area"}
              </p>
              <p className="font-inter text-brand-navy-dark">{t.location_value as string}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-brand-gray-light py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionLabel text="SEND A MESSAGE" />
          <h2 className="font-poppins font-bold text-4xl text-brand-navy mb-4">
            Get in Touch
          </h2>
          <p className="font-inter text-brand-navy-dark text-lg mb-10">
            Fill out the form and we&apos;ll get back to you within 24 hours.
          </p>
          <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 shadow-sm">
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}
