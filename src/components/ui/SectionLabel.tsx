interface SectionLabelProps {
  text: string;
  light?: boolean;
}

export default function SectionLabel({ text, light = false }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className={`font-poppins font-bold text-xs uppercase tracking-widest whitespace-nowrap ${light ? "text-white/80" : "text-brand-green"}`}>
        {text}
      </span>
      <div className={`h-px flex-1 ${light ? "bg-white/30" : "bg-brand-green/30"}`} />
    </div>
  );
}
