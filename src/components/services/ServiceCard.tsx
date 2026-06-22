"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import Card from "@/components/ui/Card";
import { serviceIcon } from "./serviceIcon";
import type { Service } from "@/lib/services";

/**
 * The single service card used on the home page and the services tabs.
 * Manifest-driven: copy comes from `services.items.<slug>.*`, the icon resolves
 * from the manifest name, and the whole card links to the service's page.
 */
export default function ServiceCard({ service }: { service: Service }) {
  const locale = useLocale();
  const t = useTranslations("services.items");
  const features = (t.raw(`${service.slug}.features`) as string[] | undefined) ?? [];

  return (
    <Link
      href={`/${locale}/services/${service.slug}`}
      className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
    >
      <Card
        icon={serviceIcon(service.icon)}
        title={t(`${service.slug}.title`)}
        desc={t(`${service.slug}.desc`)}
        features={features}
      />
    </Link>
  );
}
