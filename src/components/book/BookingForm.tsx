"use client";

import React, { useState, useEffect } from "react";

interface BookingFormProps {
  t: {
    name: string;
    phone: string;
    email: string;
    address: string;
    serviceType: string;
    frequency: string;
    homeSize: string;
    preferredDate: string;
    preferredTime: string;
    notes: string;
    language: string;
    submit: string;
    success: string;
    error: string;
    serviceTypes: { residential: string; commercial: string };
    frequencies: { oneTime: string; weekly: string; biweekly: string; monthly: string };
    homeSizes: { studio: string; medium: string; large: string; xlarge: string; commercial: string };
    times: { morning: string; afternoon: string; flexible: string };
  };
}

const inputClass =
  "w-full bg-white border border-gray-300 text-brand-navy-dark placeholder:text-gray-400 rounded-md px-4 py-3 font-inter text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none transition-colors";

const labelClass = "block font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-2";

const PREFILL_KEY = "comfy_quote_prefill";

export default function BookingForm({ t }: BookingFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [langPref, setLangPref] = useState<"English" | "Español">("English");
  const [prefill, setPrefill] = useState({ name: "", phone: "", serviceType: "" });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREFILL_KEY);
      if (stored) {
        setPrefill(JSON.parse(stored));
        localStorage.removeItem(PREFILL_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const required = ["name", "phone", "email", "address", "serviceType", "frequency", "homeSize", "preferredDate", "preferredTime"];

  function validate(form: HTMLFormElement): boolean {
    const newErrors: Record<string, boolean> = {};
    let valid = true;
    for (const field of required) {
      const el = form.elements.namedItem(field) as HTMLInputElement | HTMLSelectElement;
      if (!el || !el.value.trim()) {
        newErrors[field] = true;
        valid = false;
      }
    }
    setErrors(newErrors);
    return valid;
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    if (!validate(form)) return;

    setStatus("loading");

    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      phone: (form.elements.namedItem("phone") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      address: (form.elements.namedItem("address") as HTMLInputElement).value,
      serviceType: (form.elements.namedItem("serviceType") as HTMLSelectElement).value,
      frequency: (form.elements.namedItem("frequency") as HTMLSelectElement).value,
      homeSize: (form.elements.namedItem("homeSize") as HTMLSelectElement).value,
      preferredDate: (form.elements.namedItem("preferredDate") as HTMLInputElement).value,
      preferredTime: (form.elements.namedItem("preferredTime") as HTMLSelectElement).value,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      languagePreference: langPref,
    };

    try {
      const res = await fetch("/api/submit-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const fieldBorder = (name: string) =>
    errors[name] ? "border-red-500" : "";

  if (status === "success") {
    return (
      <div className="bg-brand-green-pale border border-brand-green rounded-xl p-8 text-center">
        <div className="text-brand-green text-5xl mb-4">✓</div>
        <p className="font-poppins font-bold text-xl text-brand-navy mb-2">{t.success}</p>
      </div>
    );
  }

  return (
    <form key={prefill.name + prefill.phone + prefill.serviceType} onSubmit={handleSubmit} noValidate className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Full Name */}
        <div>
          <label htmlFor="name" className={labelClass}>{t.name} *</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder={t.name}
            defaultValue={prefill.name}
            className={`${inputClass} ${fieldBorder("name")}`}
            onBlur={(e) => {
              if (!e.target.value.trim()) setErrors((prev) => ({ ...prev, name: true }));
              else setErrors((prev) => ({ ...prev, name: false }));
            }}
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className={labelClass}>{t.phone} *</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder={t.phone}
            defaultValue={prefill.phone}
            className={`${inputClass} ${fieldBorder("phone")}`}
            onBlur={(e) => {
              if (!e.target.value.trim()) setErrors((prev) => ({ ...prev, phone: true }));
              else setErrors((prev) => ({ ...prev, phone: false }));
            }}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className={labelClass}>{t.email} *</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder={t.email}
            className={`${inputClass} ${fieldBorder("email")}`}
            onBlur={(e) => {
              if (!e.target.value.trim()) setErrors((prev) => ({ ...prev, email: true }));
              else setErrors((prev) => ({ ...prev, email: false }));
            }}
          />
        </div>

        {/* Service Address */}
        <div>
          <label htmlFor="address" className={labelClass}>{t.address} *</label>
          <input
            id="address"
            name="address"
            type="text"
            placeholder={t.address}
            className={`${inputClass} ${fieldBorder("address")}`}
            onBlur={(e) => {
              if (!e.target.value.trim()) setErrors((prev) => ({ ...prev, address: true }));
              else setErrors((prev) => ({ ...prev, address: false }));
            }}
          />
        </div>

        {/* Service Type */}
        <div>
          <label htmlFor="serviceType" className={labelClass}>{t.serviceType} *</label>
          <select
            id="serviceType"
            name="serviceType"
            defaultValue={prefill.serviceType || ""}
            className={`${inputClass} ${fieldBorder("serviceType")}`}
          >
            <option value="" disabled>{t.serviceType}</option>
            <option value={t.serviceTypes.residential}>{t.serviceTypes.residential}</option>
            <option value={t.serviceTypes.commercial}>{t.serviceTypes.commercial}</option>
          </select>
        </div>

        {/* Frequency */}
        <div>
          <label htmlFor="frequency" className={labelClass}>{t.frequency} *</label>
          <select
            id="frequency"
            name="frequency"
            defaultValue=""
            className={`${inputClass} ${fieldBorder("frequency")}`}
          >
            <option value="" disabled>{t.frequency}</option>
            <option value={t.frequencies.oneTime}>{t.frequencies.oneTime}</option>
            <option value={t.frequencies.weekly}>{t.frequencies.weekly}</option>
            <option value={t.frequencies.biweekly}>{t.frequencies.biweekly}</option>
            <option value={t.frequencies.monthly}>{t.frequencies.monthly}</option>
          </select>
        </div>

        {/* Home Size */}
        <div>
          <label htmlFor="homeSize" className={labelClass}>{t.homeSize} *</label>
          <select
            id="homeSize"
            name="homeSize"
            defaultValue=""
            className={`${inputClass} ${fieldBorder("homeSize")}`}
          >
            <option value="" disabled>{t.homeSize}</option>
            <option value="studio">{t.homeSizes.studio}</option>
            <option value="medium">{t.homeSizes.medium}</option>
            <option value="large">{t.homeSizes.large}</option>
            <option value="xlarge">{t.homeSizes.xlarge}</option>
            <option value="commercial">{t.homeSizes.commercial}</option>
          </select>
        </div>

        {/* Preferred Date */}
        <div>
          <label htmlFor="preferredDate" className={labelClass}>{t.preferredDate} *</label>
          <input
            id="preferredDate"
            name="preferredDate"
            type="date"
            className={`${inputClass} ${fieldBorder("preferredDate")}`}
          />
        </div>

        {/* Preferred Time */}
        <div>
          <label htmlFor="preferredTime" className={labelClass}>{t.preferredTime} *</label>
          <select
            id="preferredTime"
            name="preferredTime"
            defaultValue=""
            className={`${inputClass} ${fieldBorder("preferredTime")}`}
          >
            <option value="" disabled>{t.preferredTime}</option>
            <option value={t.times.morning}>{t.times.morning}</option>
            <option value={t.times.afternoon}>{t.times.afternoon}</option>
            <option value={t.times.flexible}>{t.times.flexible}</option>
          </select>
        </div>
      </div>

      {/* Special Notes */}
      <div>
        <label htmlFor="notes" className={labelClass}>{t.notes}</label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder={t.notes}
          className={inputClass}
        />
      </div>

      {/* Language preference */}
      <div>
        <label className={labelClass}>{t.language}</label>
        <div className="flex gap-2">
          {(["English", "Español"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLangPref(lang)}
              className={`px-4 py-2 rounded-md font-poppins font-bold text-xs uppercase tracking-wider transition-colors ${
                langPref === lang
                  ? "bg-brand-green text-white"
                  : "border border-gray-300 text-brand-navy hover:border-brand-green"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Error message */}
      {status === "error" && (
        <p className="text-red-500 font-inter text-sm">{t.error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-poppins font-bold uppercase tracking-wider py-4 rounded-md transition-colors disabled:opacity-50 text-sm"
      >
        {status === "loading" ? "..." : t.submit}
      </button>
    </form>
  );
}
