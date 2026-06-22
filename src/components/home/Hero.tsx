"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import WaveDivider from "@/components/ui/WaveDivider";

interface HeroProps {
  locale: string;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

const PREFILL_KEY = "comfy_quote_prefill";

const quoteFieldClass =
  "bg-white border border-gray-300 text-brand-navy-dark placeholder-gray-500 rounded-lg px-4 py-3 text-sm focus:border-brand-green focus:ring-2 focus:ring-brand-green/30 focus:outline-none transition-colors";

export default function Hero({
  locale,
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary,
}: HeroProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    localStorage.setItem(PREFILL_KEY, JSON.stringify({ name, phone, serviceType: service }));
    router.push(`/${locale}/book`);
  }

  return (
    <>
      <section className="relative flex items-stretch overflow-hidden bg-white lg:min-h-[88vh]">
        {/* Soft brand wash behind the composition */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_15%,rgba(81,167,85,0.07),transparent_60%)]"
        />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-4 py-16 sm:px-6 lg:flex-row lg:gap-14 lg:px-8 lg:py-0">
          {/* Left — photo (container matches the image's natural ~4:3 ratio so it
              fills without distortion or heavy cropping) */}
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-3xl bg-brand-green-pale shadow-xl shadow-brand-navy/10 lg:w-1/2">
            <Image
              src="/images/hero-cleaning.jpg"
              alt="Comfy Clean Co. cleaning team ready for a home visit"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center"
            />
          </div>

          {/* Right — copy + inline quote form */}
          <div className="flex w-full flex-col items-start lg:w-1/2">
            <Reveal>
              <p className="mb-4 font-poppins text-xs font-bold uppercase tracking-[0.18em] text-brand-green-dark">
                Clean · Fresh · Reliable
              </p>
            </Reveal>

            <Reveal delay={70}>
              <h1 className="text-display mb-5 font-poppins font-extrabold text-brand-navy">
                {headline}
              </h1>
            </Reveal>

            <Reveal delay={130}>
              <p className="mb-8 max-w-xl font-inter text-lg leading-relaxed text-brand-navy-dark/90">
                {subheadline}
              </p>
            </Reveal>

            {/* Inline quick-quote form */}
            <Reveal delay={190} className="w-full">
              <form
                className="flex w-full flex-col gap-4 rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-lg shadow-brand-navy/5 backdrop-blur-sm"
                onSubmit={handleSubmit}
              >
                <p className="font-poppins text-lg font-bold text-brand-navy">
                  Get Your Free Quote
                </p>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={quoteFieldClass}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={quoteFieldClass}
                />
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className={`${quoteFieldClass} ${service ? "text-brand-navy-dark" : "text-gray-500"}`}
                >
                  <option value="" disabled>
                    Service Needed
                  </option>
                  <option>Residential Cleaning</option>
                  <option>Commercial Cleaning</option>
                  <option>Deep Clean</option>
                  <option>Move-in / Move-out</option>
                  <option>Recurring Service</option>
                </select>
                <button
                  type="submit"
                  className="press inline-flex items-center justify-center gap-2 rounded-lg bg-brand-green px-6 py-3 font-poppins text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-green-dark"
                >
                  {ctaPrimary}
                </button>
              </form>
            </Reveal>

            <Reveal delay={250}>
              <Link
                href={`/${locale}/services`}
                className="group mt-5 inline-flex items-center gap-1.5 border-b-2 border-brand-navy/70 pb-0.5 font-poppins text-sm font-bold uppercase tracking-wider text-brand-navy transition-colors hover:border-brand-green hover:text-brand-green"
              >
                {ctaSecondary}
                <ArrowRight
                  size={15}
                  className="transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5"
                />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Wave motif — bridges the white hero into the green WhyUs band */}
      <WaveDivider fill="var(--color-brand-green)" className="-mt-px" />
    </>
  );
}
