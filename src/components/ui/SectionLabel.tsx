interface SectionLabelProps {
  text: string;
}

export default function SectionLabel({ text }: SectionLabelProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="font-montserrat font-bold text-xs uppercase tracking-widest text-brand-blue whitespace-nowrap">
        {text}
      </span>
      <div className="h-px flex-1 bg-brand-border" />
    </div>
  );
}
