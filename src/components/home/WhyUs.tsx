import { MapPin, Clock, Building2, MessageCircle } from "lucide-react";
import SectionLabel from "@/components/ui/SectionLabel";
import Reveal from "@/components/ui/Reveal";

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
    <section className="section-py bg-brand-green">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionLabel text={t.label} light />
        <h2 className="text-section mb-12 max-w-2xl font-poppins font-bold text-white">
          {t.headline}
        </h2>
        {/* Boxless feature grid — deliberately distinct from the elevated Services cards */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, i) => {
            const Icon = icons[i];
            return (
              <Reveal key={i} delay={i * 70}>
                <div className="flex flex-col">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                    <Icon size={26} className="text-white" strokeWidth={2} />
                  </div>
                  <h3 className="mb-2 font-poppins text-lg font-bold text-white">{card.title}</h3>
                  <p className="font-inter text-sm leading-relaxed text-white/85">{card.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
