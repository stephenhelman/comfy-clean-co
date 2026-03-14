"use client";

import Link from "next/link";

interface HeroProps {
  locale: string;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

export default function Hero({
  locale,
  headline,
  subheadline,
  ctaPrimary,
  ctaSecondary,
}: HeroProps) {
  return (
    <>
      <section className="relative min-h-[90vh] flex items-stretch overflow-hidden bg-white">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center gap-10 py-16 lg:py-0">
          {/* Left — photo */}
          <div className="w-full lg:w-1/2 h-64 sm:h-96 lg:h-[600px] rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
            <img
              src="/images/hero-cleaning.jpg"
              alt="Professional cleaning team"
              className="w-full h-full object-center"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = "none";
                (el.parentElement as HTMLElement).style.background = "#E8F5E9";
              }}
            />
          </div>

          {/* Right — copy + inline quote form */}
          <div className="w-full lg:w-1/2 flex flex-col items-start">
            <p className="font-poppins font-bold text-xs uppercase tracking-widest text-brand-green mb-4">
              Clean · Fresh · Reliable
            </p>

            <h1 className="font-poppins font-extrabold text-4xl sm:text-5xl lg:text-6xl text-brand-navy leading-tight mb-4">
              {headline}
            </h1>

            <p className="font-inter text-lg text-brand-navy-dark max-w-xl mb-8 leading-relaxed">
              {subheadline}
            </p>

            {/* Inline quick-quote form */}
            <form
              className="w-full bg-white border border-gray-200 rounded-xl p-6 shadow-md flex flex-col gap-4"
              onSubmit={(e) => e.preventDefault()}
            >
              <p className="font-poppins font-bold text-brand-navy text-lg">
                Get Your Free Quote
              </p>
              <input
                type="text"
                placeholder="Your Name"
                className="bg-white border border-gray-300 text-brand-navy-dark placeholder-gray-400 rounded-md px-4 py-3 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Phone Number"
                className="bg-white border border-gray-300 text-brand-navy-dark placeholder-gray-400 rounded-md px-4 py-3 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
              />
              <select
                className="bg-white border border-gray-300 text-brand-navy-dark rounded-md px-4 py-3 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
                defaultValue=""
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
                className="bg-brand-green hover:bg-brand-green-dark text-white font-poppins font-bold uppercase tracking-wider rounded-md px-6 py-3 text-sm transition-colors"
              >
                {ctaPrimary}
              </button>
            </form>

            <Link
              href={`/${locale}/services`}
              className="mt-4 font-poppins font-bold text-sm uppercase tracking-wider text-brand-navy border-b-2 border-brand-navy hover:text-brand-green hover:border-brand-green transition-colors"
            >
              {ctaSecondary} →
            </Link>
          </div>
        </div>
      </section>

      {/* Green wave divider */}
      <div className="w-full overflow-hidden leading-none -mt-1">
        <svg
          viewBox="0 0 1440 60"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full h-12 sm:h-16"
        >
          <path
            d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z"
            fill="#51A755"
          />
        </svg>
      </div>
    </>
  );
}
