"use client";

import React from "react";
import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}

export default function Button({
  children,
  href,
  onClick,
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-montserrat font-bold uppercase tracking-wider px-6 py-3 rounded transition-all duration-200 text-sm";
  const variants = {
    primary:
      "bg-brand-blue text-brand-black hover:bg-brand-blue-light active:bg-brand-blue-dark disabled:opacity-50",
    ghost:
      "border border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-brand-black active:bg-brand-blue-dark disabled:opacity-50",
  };

  const classes = `${base} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {children}
    </button>
  );
}
