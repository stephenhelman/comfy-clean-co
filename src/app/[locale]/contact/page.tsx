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
    <div className="min-h-screen bg-brand-black py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label ?? "GET IN TOUCH"} />
        <h1 className="font-montserrat font-black text-5xl text-brand-white mb-12">
          {t.headline ?? "Contact Comfy Clean Co."}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-brand-card border border-brand-border rounded-lg p-6">
            <Phone size={24} className="text-brand-blue mb-3" />
            <p className="font-montserrat font-bold text-xs uppercase tracking-wider text-brand-gray-mid mb-1">
              {t.phone_label ?? "Phone"}
            </p>
            <p className="font-inter text-brand-silver">[PLACEHOLDER — client to provide]</p>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-lg p-6">
            <Mail size={24} className="text-brand-blue mb-3" />
            <p className="font-montserrat font-bold text-xs uppercase tracking-wider text-brand-gray-mid mb-1">
              {t.email_label ?? "Email"}
            </p>
            <p className="font-inter text-brand-silver">[PLACEHOLDER — client to provide]</p>
          </div>

          <div className="bg-brand-card border border-brand-border rounded-lg p-6">
            <MapPin size={24} className="text-brand-blue mb-3" />
            <p className="font-montserrat font-bold text-xs uppercase tracking-wider text-brand-gray-mid mb-1">
              {t.location_label ?? "Service Area"}
            </p>
            <p className="font-inter text-brand-silver">{t.location_value}</p>
          </div>
        </div>

        <Button href={`/${locale}/book`} variant="primary">
          {t.cta ?? "Book a Free Visit →"}
        </Button>
      </div>
    </div>
  );
}
