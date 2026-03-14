interface BadgeProps {
  children: React.ReactNode;
}

export default function Badge({ children }: BadgeProps) {
  return (
    <span className="inline-block bg-brand-green-pale border border-brand-green text-brand-green text-xs font-poppins font-bold uppercase tracking-wider px-3 py-1 rounded-full">
      {children}
    </span>
  );
}
