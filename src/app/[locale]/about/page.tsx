import { getMessages } from "next-intl/server";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AboutPage({ params }: PageProps) {
  const { locale } = await params;
  const messages = await getMessages({ locale }) as Record<string, Record<string, string>>;
  const t = messages.about ?? {};

  return (
    <div className="min-h-screen bg-brand-black py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label ?? "OUR STORY"} />
        <h1 className="font-montserrat font-black text-5xl text-brand-white mb-8">
          {t.headline ?? "About Comfy Clean Co."}
        </h1>
        <div className="space-y-6">
          <p className="font-inter text-brand-silver text-lg leading-relaxed">{t.p1}</p>
          <p className="font-inter text-brand-silver text-lg leading-relaxed">{t.p2}</p>
          <p className="font-inter text-xl font-bold text-brand-white leading-relaxed">{t.p3}</p>
        </div>
        <div className="mt-12">
          <Button href={`/${locale}/book`} variant="primary">
            {locale === "es" ? "Reserva una Visita Gratis →" : "Book a Free Visit →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
