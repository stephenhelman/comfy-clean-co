"use client";

import React from "react";
import Link from "next/link";

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
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
    "inline-flex items-center justify-center font-poppins font-bold uppercase tracking-wider px-6 py-3 rounded-md transition-all duration-200 text-sm";
  const variants = {
    primary:
      "bg-brand-green text-white hover:bg-brand-green-dark active:bg-brand-green-dark disabled:opacity-50",
    secondary:
      "border-2 border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white active:bg-brand-navy-dark disabled:opacity-50",
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
