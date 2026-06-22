"use client";

import { Home, Building2, CalendarCheck } from "lucide-react";
import Card from "@/components/ui/Card";

const iconMap = { Home, Building2, CalendarCheck } as const;
type IconName = keyof typeof iconMap;

interface ServiceCardProps {
  icon: IconName;
  title: string;
  desc: string;
  features: string[];
}

/**
 * Thin adapter so the server-rendered Services page can reference icons by name
 * and reuse the single canonical Card markup.
 */
export default function ServiceCard({ icon, title, desc, features }: ServiceCardProps) {
  return <Card icon={iconMap[icon]} title={title} desc={desc} features={features} />;
}
