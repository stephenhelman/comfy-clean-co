"use client";

import React, { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check } from "lucide-react";
import {
  DIVISIONS,
  getServicesByDivision,
  getServiceBySlug,
  type Division,
} from "@/lib/services";

export interface BookingFormProps {
  t: {
    name: string;
    phone: string;
    email: string;
    notes: string;
    language: string;
    division: string;
    service: string;
    servicePlaceholder: string;
    preferredDate: string;
    preferredTime: string;
    timeNoPreference: string;
    times: { morning: string; afternoon: string; flexible: string };
    submit: string;
    success: string;
    error: string;
    divisions: { residential: string; commercial: string };
    smsConsent: string;
  };
  /** Lead source tag persisted with the submission (placement default). */
  source?: string;
  /** Preset + lock the form to a specific service (service pages). */
  presetService?: string;
  presetDivision?: Division;
  lockService?: boolean;
}

const inputClass =
  "w-full bg-white border border-gray-300 text-brand-navy-dark placeholder:text-gray-500 rounded-lg px-4 py-3 font-inter text-sm focus:border-brand-green focus:ring-2 focus:ring-brand-green/30 focus:outline-none transition-colors";
const labelClass = "block font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-2";

const PREFILL_KEY = "comfy_quote_prefill";

interface Prefill {
  name?: string;
  phone?: string;
  service?: string;
  division?: Division;
  source?: string;
}

const REQUIRED = ["name", "phone", "email", "division", "service"] as const;

export default function BookingForm({
  t,
  source = "book",
  presetService,
  presetDivision,
  lockService = false,
}: BookingFormProps) {
  const locale = useLocale();
  const items = useTranslations("services.items");

  const initialDivision: Division =
    presetDivision ?? (presetService ? getServiceBySlug(presetService)?.division : undefined) ?? "residential";

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [lang, setLang] = useState<"en" | "es">(locale === "es" ? "es" : "en");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [division, setDivision] = useState<Division>(initialDivision);
  const [service, setService] = useState(presetService ?? "");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  // Transactional SMS consent — optional, unchecked by default.
  const [smsConsent, setSmsConsent] = useState(false);
  // A carried source (e.g. "home-hero") set by the hero prefill wins over the placement default.
  const [carriedSource, setCarriedSource] = useState<string | null>(null);

  // Hero quick-quote → localStorage prefill (only when not a locked service page).
  useEffect(() => {
    if (lockService) return;
    try {
      const stored = localStorage.getItem(PREFILL_KEY);
      if (!stored) return;
      const p = JSON.parse(stored) as Prefill;
      if (p.name) setName(p.name);
      if (p.phone) setPhone(p.phone);
      if (p.division) setDivision(p.division);
      if (p.service && getServiceBySlug(p.service)) setService(p.service);
      if (p.source) setCarriedSource(p.source);
      localStorage.removeItem(PREFILL_KEY);
    } catch {
      // ignore
    }
  }, [lockService]);

  const serviceOptions = getServicesByDivision(division);

  function onDivisionChange(next: Division) {
    setDivision(next);
    setService(""); // service list depends on division; reset the picker
    setErrors((e) => ({ ...e, division: false }));
  }

  function validate(): boolean {
    const values: Record<string, string> = { name, phone, email, division, service };
    const next: Record<string, boolean> = {};
    let ok = true;
    for (const field of REQUIRED) {
      if (!values[field]?.trim()) {
        next[field] = true;
        ok = false;
      }
    }
    setErrors(next);
    return ok;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("loading");

    const payload = {
      name,
      phone,
      email,
      division,
      service,
      preferredDate: preferredDate || undefined,
      preferredTime: preferredTime || undefined,
      notes: notes || undefined,
      lang,
      source: carriedSource ?? source,
      smsConsent,
      website: (e.currentTarget.elements.namedItem("website") as HTMLInputElement)?.value ?? "",
    };

    try {
      const res = await fetch("/api/submit-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      setStatus(json.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  const errBorder = (name: string) => (errors[name] ? "border-red-500" : "");

  if (status === "success") {
    return (
      <div className="animate-pop-in rounded-2xl border border-brand-green bg-brand-green-pale p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green">
          <Check size={30} className="text-white" strokeWidth={3} />
        </div>
        <p className="font-poppins text-xl font-bold text-brand-navy">{t.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Honeypot */}
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        style={{ display: "none" }}
        defaultValue=""
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClass}>{t.name} *</label>
          <input id="name" name="name" type="text" placeholder={t.name} value={name}
            onChange={(e) => setName(e.target.value)} className={`${inputClass} ${errBorder("name")}`} />
        </div>
        <div>
          <label htmlFor="phone" className={labelClass}>{t.phone} *</label>
          <input id="phone" name="phone" type="tel" placeholder={t.phone} value={phone}
            onChange={(e) => setPhone(e.target.value)} className={`${inputClass} ${errBorder("phone")}`} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="email" className={labelClass}>{t.email} *</label>
          <input id="email" name="email" type="email" placeholder={t.email} value={email}
            onChange={(e) => setEmail(e.target.value)} className={`${inputClass} ${errBorder("email")}`} />
        </div>
      </div>

      {/* Division — locked on a service page, otherwise a chooser that filters services */}
      <div>
        <label className={labelClass}>{t.division} *</label>
        {lockService ? (
          <p className="font-inter text-sm text-brand-navy-dark">{t.divisions[division]}</p>
        ) : (
          <div className="flex gap-3">
            {DIVISIONS.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={division === d}
                onClick={() => onDivisionChange(d)}
                className={`press flex-1 rounded-lg border-2 px-4 py-3 font-inter text-sm font-medium transition-colors ${
                  division === d
                    ? "border-brand-green bg-brand-green text-white"
                    : "border-gray-200 bg-white text-brand-navy hover:border-brand-green/50 hover:bg-brand-green-pale"
                }`}
              >
                {t.divisions[d]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Service — manifest-driven; locked to a single value on a service page */}
      <div>
        <label htmlFor="service" className={labelClass}>{t.service} *</label>
        {lockService && service ? (
          <div className="rounded-lg border border-gray-300 bg-brand-off-white px-4 py-3 font-inter text-sm text-brand-navy-dark">
            {items(`${service}.title`)}
          </div>
        ) : (
          <select
            id="service"
            name="service"
            value={service}
            onChange={(e) => {
              setService(e.target.value);
              setErrors((er) => ({ ...er, service: false }));
            }}
            className={`${inputClass} ${errBorder("service")} ${service ? "text-brand-navy-dark" : "text-gray-500"}`}
          >
            <option value="" disabled>{t.servicePlaceholder}</option>
            {serviceOptions.map((s) => (
              <option key={s.slug} value={s.slug}>{items(`${s.slug}.title`)}</option>
            ))}
          </select>
        )}
      </div>

      {/* Preferred date + time (optional) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="preferredDate" className={labelClass}>{t.preferredDate}</label>
          <input id="preferredDate" name="preferredDate" type="date" value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className={`${inputClass} ${preferredDate ? "text-brand-navy-dark" : "text-gray-500"}`} />
        </div>
        <div>
          <label htmlFor="preferredTime" className={labelClass}>{t.preferredTime}</label>
          <select id="preferredTime" name="preferredTime" value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className={`${inputClass} ${preferredTime ? "text-brand-navy-dark" : "text-gray-500"}`}>
            <option value="">{t.timeNoPreference}</option>
            <option value={t.times.morning}>{t.times.morning}</option>
            <option value={t.times.afternoon}>{t.times.afternoon}</option>
            <option value={t.times.flexible}>{t.times.flexible}</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>{t.notes}</label>
        <textarea id="notes" name="notes" rows={4} placeholder={t.notes} value={notes}
          onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </div>

      {/* Communication language */}
      <div>
        <label className={labelClass}>{t.language}</label>
        <div className="flex gap-2">
          {(["en", "es"] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={lang === code}
              onClick={() => setLang(code)}
              className={`press rounded-lg px-4 py-2 font-poppins text-xs font-bold uppercase tracking-wider transition-colors ${
                lang === code
                  ? "bg-brand-green text-white"
                  : "border border-gray-300 text-brand-navy hover:border-brand-green"
              }`}
            >
              {code === "en" ? "English" : "Español"}
            </button>
          ))}
        </div>
      </div>

      {/* Transactional SMS consent — optional, unchecked by default. */}
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="smsConsent"
          checked={smsConsent}
          onChange={(e) => setSmsConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-green"
        />
        <span className="font-inter text-xs leading-relaxed text-brand-navy-dark/80">
          {t.smsConsent}
        </span>
      </label>

      {status === "error" && <p className="font-inter text-sm text-red-500">{t.error}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="press w-full rounded-lg bg-brand-green py-4 font-poppins text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-brand-green-dark disabled:opacity-50"
      >
        {status === "loading" ? "..." : t.submit}
      </button>
    </form>
  );
}
