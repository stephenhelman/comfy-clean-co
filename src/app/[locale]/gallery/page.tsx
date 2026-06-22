import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ImageIcon } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import Reveal from "@/components/ui/Reveal";
import BeforeAfterCard from "@/components/gallery/BeforeAfterCard";
import { getGalleryItems } from "@/lib/gallery";
import { localeAlternates } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: localeAlternates(locale, "/gallery"),
  };
}

export default async function GalleryPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery" });
  const items = getGalleryItems();
  const labels = { before: t("before"), after: t("after") };

  return (
    <div className="section-py min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t("label")} />
        <h1 className="text-display mb-4 font-poppins font-bold text-brand-navy">{t("headline")}</h1>
        <p className="mb-12 max-w-2xl font-inter text-lg leading-relaxed text-brand-navy-dark/90">
          {t("subhead")}
        </p>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <Reveal key={i} delay={i * 80}>
                <BeforeAfterCard item={item} labels={labels} />
              </Reveal>
            ))}
          </div>
        ) : (
          // Coming-soon placeholder (no real photos yet) — first-class, design-system styled.
          <Reveal>
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-brand-green/40 bg-brand-off-white px-6 py-20 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green-pale">
                <ImageIcon size={30} className="text-brand-green" strokeWidth={2} />
              </div>
              <h2 className="mb-2 font-poppins text-xl font-bold text-brand-navy">{t("emptyTitle")}</h2>
              <p className="max-w-md font-inter text-brand-navy-dark/80">{t("emptyBody")}</p>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}
