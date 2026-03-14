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
    <div className="bg-brand-off-white border border-gray-200 border-t-4 border-t-brand-green rounded-xl p-6 hover:shadow-md transition-shadow duration-200">
      <div className="w-12 h-12 rounded-full bg-brand-green-pale flex items-center justify-center mb-4">
        <Icon size={24} className="text-brand-green" />
      </div>
      <h3 className="font-poppins font-bold text-xl text-brand-navy mb-2">{title}</h3>
      <p className="font-inter text-sm text-brand-navy-dark leading-relaxed mb-4">{desc}</p>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-brand-navy-dark font-inter">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
