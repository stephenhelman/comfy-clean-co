"use client";

import { Home, Building2, CalendarCheck } from "lucide-react";

const iconMap = { Home, Building2, CalendarCheck } as const;
type IconName = keyof typeof iconMap;

interface ServiceCardProps {
  icon: IconName;
  title: string;
  desc: string;
  features: string[];
}

export default function ServiceCard({ icon, title, desc, features }: ServiceCardProps) {
  const Icon = iconMap[icon];
  return (
    <div
      className="bg-brand-card border border-brand-border border-t-2 border-t-brand-blue rounded-lg p-6 hover:border-brand-blue transition-all duration-200"
      onMouseOver={(e) =>
        ((e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 20px #5BB8E820")
      }
      onMouseOut={(e) =>
        ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")
      }
    >
      <div className="mb-4">
        <Icon size={36} className="text-brand-blue" />
      </div>
      <h3 className="font-montserrat font-bold text-xl text-brand-white mb-2">{title}</h3>
      <p className="font-inter text-sm text-brand-silver leading-relaxed mb-4">{desc}</p>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-brand-gray-light font-inter">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
