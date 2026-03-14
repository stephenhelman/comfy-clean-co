import { getMessages } from "next-intl/server";
import { Phone, Mail, MapPin } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ContactPage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, string>>;
  const t = messages.contact ?? {};

  return (
    <div className="min-h-screen bg-white py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label ?? "GET IN TOUCH"} />
        <h1 className="font-poppins font-bold text-5xl text-brand-navy mb-12">
          {t.headline ?? "Contact Comfy Clean Co."}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-brand-off-white border border-gray-200 rounded-xl p-6">
            <div className="w-10 h-10 rounded-full bg-brand-green-pale flex items-center justify-center mb-3">
              <Phone size={20} className="text-brand-green" />
            </div>
            <p className="font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-1">
              {t.phone_label ?? "Phone"}
            </p>
            <p className="font-inter text-brand-navy-dark">[PLACEHOLDER — client to provide]</p>
          </div>

          <div className="bg-brand-off-white border border-gray-200 rounded-xl p-6">
            <div className="w-10 h-10 rounded-full bg-brand-green-pale flex items-center justify-center mb-3">
              <Mail size={20} className="text-brand-green" />
            </div>
            <p className="font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-1">
              {t.email_label ?? "Email"}
            </p>
            <p className="font-inter text-brand-navy-dark">[PLACEHOLDER — client to provide]</p>
          </div>

          <div className="bg-brand-off-white border border-gray-200 rounded-xl p-6">
            <div className="w-10 h-10 rounded-full bg-brand-green-pale flex items-center justify-center mb-3">
              <MapPin size={20} className="text-brand-green" />
            </div>
            <p className="font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-1">
              {t.location_label ?? "Service Area"}
            </p>
            <p className="font-inter text-brand-navy-dark">{t.location_value}</p>
          </div>
        </div>

        <Button href={`/${locale}/book`} variant="primary">
          {t.cta ?? "Book a Free Visit →"}
        </Button>
      </div>
    </div>
  );
}
