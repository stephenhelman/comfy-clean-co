"use client";

import { MapPin, Clock, Building2, MessageCircle } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";

interface WhyUsProps {
  t: {
    label: string;
    headline: string;
    card1_title: string;
    card1_desc: string;
    card2_title: string;
    card2_desc: string;
    card3_title: string;
    card3_desc: string;
    card4_title: string;
    card4_desc: string;
  };
}

const icons = [MapPin, Clock, Building2, MessageCircle];

export default function WhyUs({ t }: WhyUsProps) {
  const cards = [
    { title: t.card1_title, desc: t.card1_desc },
    { title: t.card2_title, desc: t.card2_desc },
    { title: t.card3_title, desc: t.card3_desc },
    { title: t.card4_title, desc: t.card4_desc },
  ];

  return (
    <section className="py-24 bg-brand-green">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} light />
        <h2 className="font-poppins font-bold text-4xl sm:text-5xl text-white mb-12">
          {t.headline}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => {
            const Icon = icons[i];
            return (
              <div
                key={i}
                className="bg-white/15 border border-white/25 rounded-xl p-6 hover:bg-white/20 transition-colors duration-200"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-4">
                  <Icon size={24} className="text-white" />
                </div>
                <h3 className="font-poppins font-bold text-lg text-white mb-2">
                  {card.title}
                </h3>
                <p className="font-inter text-sm text-white/85 leading-relaxed">
                  {card.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
