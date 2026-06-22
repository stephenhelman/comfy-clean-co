interface SectionLabelProps {
  text: string;
  light?: boolean;
}

/**
 * The brand kicker — a single, deliberate section-label system (green dot +
 * label + hairline). Used consistently as voice, not as a per-section reflex.
 */
export default function SectionLabel({ text, light = false }: SectionLabelProps) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${light ? "bg-white" : "bg-brand-green"}`}
        aria-hidden="true"
      />
      <span
        className={`whitespace-nowrap font-poppins text-xs font-bold uppercase tracking-[0.18em] ${
          light ? "text-white" : "text-brand-green-dark"
        }`}
      >
        {text}
      </span>
      <div className={`h-px flex-1 ${light ? "bg-white/30" : "bg-brand-green/25"}`} />
    </div>
  );
}
