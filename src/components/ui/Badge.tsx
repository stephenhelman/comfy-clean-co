interface BadgeProps {
  children: React.ReactNode;
}

export default function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-block bg-brand-blue-glow border border-brand-blue text-brand-blue text-xs font-montserrat font-bold uppercase tracking-wider px-3 py-1 rounded-full">
      {children}
    </span>
  );
}
