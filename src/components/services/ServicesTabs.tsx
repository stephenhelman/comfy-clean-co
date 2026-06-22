"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import ServiceCard from "@/components/services/ServiceCard";
import { DIVISIONS, getServicesByDivision, type Division } from "@/lib/services";

/**
 * Residential | Commercial tabs over the service manifest. Keyboard- and
 * screen-reader-accessible (roving arrow-key focus, aria tab/tabpanel wiring).
 */
export default function ServicesTabs() {
  const t = useTranslations("services.tabs");
  const [active, setActive] = useState<Division>("residential");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent) {
    const idx = DIVISIONS.indexOf(active);
    let next: Division | null = null;
    if (e.key === "ArrowRight") next = DIVISIONS[(idx + 1) % DIVISIONS.length];
    else if (e.key === "ArrowLeft") next = DIVISIONS[(idx - 1 + DIVISIONS.length) % DIVISIONS.length];
    if (next) {
      e.preventDefault();
      setActive(next);
      tabRefs.current[next]?.focus();
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="Service divisions" className="mb-8 flex gap-2" onKeyDown={onKeyDown}>
        {DIVISIONS.map((division) => {
          const selected = division === active;
          return (
            <button
              key={division}
              ref={(el) => {
                tabRefs.current[division] = el;
              }}
              role="tab"
              id={`tab-${division}`}
              aria-selected={selected}
              aria-controls={`panel-${division}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(division)}
              className={`press rounded-lg px-5 py-2.5 font-poppins text-sm font-bold uppercase tracking-wider transition-colors ${
                selected
                  ? "bg-brand-green text-white"
                  : "border border-gray-300 text-brand-navy hover:border-brand-green"
              }`}
            >
              {t(division)}
            </button>
          );
        })}
      </div>

      {DIVISIONS.map((division) => (
        <div
          key={division}
          role="tabpanel"
          id={`panel-${division}`}
          aria-labelledby={`tab-${division}`}
          hidden={division !== active}
        >
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {getServicesByDivision(division).map((svc) => (
              <ServiceCard key={svc.slug} service={svc} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
