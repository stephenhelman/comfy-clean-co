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
    <section className="py-24 bg-brand-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} />
        <h2 className="font-montserrat font-black text-4xl sm:text-5xl text-brand-white mb-12">
          {t.headline}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => {
            const Icon = icons[i];
            return (
              <div
                key={i}
                className="bg-brand-card border border-brand-border rounded-lg p-6 hover:border-brand-blue transition-all duration-200 group"
                style={{ transition: "box-shadow 0.2s" }}
                onMouseOver={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 0 20px #5BB8E820")
                }
                onMouseOut={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.boxShadow = "none")
                }
              >
                <div className="mb-4">
                  <Icon size={28} className="text-brand-blue" />
                </div>
                <h3 className="font-montserrat font-bold text-lg text-brand-white mb-2">
                  {card.title}
                </h3>
                <p className="font-inter text-sm text-brand-silver leading-relaxed">
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
