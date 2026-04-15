"use client";

import { useState } from "react";
import { contactSchema } from "@/lib/schemas/contactSchema";

const inputClass =
  "w-full bg-white border border-gray-300 text-brand-navy-dark placeholder:text-gray-400 rounded-md px-4 py-3 font-inter text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none transition-colors";

const labelClass =
  "block font-poppins font-bold text-xs uppercase tracking-wider text-brand-navy mb-2";

const errorClass = "text-red-500 font-inter text-xs mt-1";

type Fields = {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  website: string;
};

type FieldErrors = Partial<Record<keyof Fields, string>>;

const empty: Fields = { name: "", email: "", phone: "", service: "", message: "", website: "" };

export default function ContactForm() {
  const [fields, setFields] = useState<Fields>(empty);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiError, setApiError] = useState("");

  function set(key: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
      if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side Zod validation
    const result = contactSchema.safeParse(fields);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      setFieldErrors({
        name: flat.name?.[0],
        email: flat.email?.[0],
        phone: flat.phone?.[0],
        service: flat.service?.[0],
        message: flat.message?.[0],
      });
      return;
    }

    setFieldErrors({});
    setStatus("loading");
    setApiError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      const json = await res.json();

      if (res.ok) {
        setStatus("success");
      } else if (res.status === 400 && json.fields) {
        // Field-level errors from API
        const serverFields = json.fields as Record<string, string[]>;
        setFieldErrors({
          name: serverFields.name?.[0],
          email: serverFields.email?.[0],
          phone: serverFields.phone?.[0],
          service: serverFields.service?.[0],
          message: serverFields.message?.[0],
        });
        setStatus("idle");
      } else {
        setApiError(json.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setApiError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-brand-green-pale border border-brand-green rounded-xl p-8 text-center">
        <div className="text-brand-green text-5xl mb-4">✓</div>
        <p className="font-poppins font-bold text-xl text-brand-navy mb-2">
          Message received!
        </p>
        <p className="font-inter text-brand-navy-dark text-sm">
          We&apos;ll be in touch within 24 hours. You can also reach us at{" "}
          <strong>915-979-5151</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Honeypot — hidden from real users, catches bots that fill all fields */}
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        style={{ display: "none" }}
        value={fields.website}
        onChange={set("website")}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Name */}
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            Full Name *
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            placeholder="Your name"
            value={fields.name}
            onChange={set("name")}
            className={`${inputClass} ${fieldErrors.name ? "border-red-500" : ""}`}
          />
          {fieldErrors.name && <p className={errorClass}>{fieldErrors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email *
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={fields.email}
            onChange={set("email")}
            className={`${inputClass} ${fieldErrors.email ? "border-red-500" : ""}`}
          />
          {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="contact-phone" className={labelClass}>
            Phone *
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            placeholder="(915) 000-0000"
            value={fields.phone}
            onChange={set("phone")}
            className={`${inputClass} ${fieldErrors.phone ? "border-red-500" : ""}`}
          />
          {fieldErrors.phone && <p className={errorClass}>{fieldErrors.phone}</p>}
        </div>

        {/* Service */}
        <div>
          <label htmlFor="contact-service" className={labelClass}>
            Service Interested In *
          </label>
          <select
            id="contact-service"
            name="service"
            value={fields.service}
            onChange={set("service")}
            className={`${inputClass} ${fieldErrors.service ? "border-red-500" : ""}`}
          >
            <option value="" disabled>
              Select a service
            </option>
            <option value="Residential Cleaning">Residential Cleaning</option>
            <option value="Commercial Cleaning">Commercial Cleaning</option>
            <option value="Recurring Plan">Recurring Plan</option>
            <option value="Move-in / Move-out">Move-in / Move-out</option>
            <option value="Other">Other</option>
          </select>
          {fieldErrors.service && <p className={errorClass}>{fieldErrors.service}</p>}
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Message *
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          placeholder="Tell us a bit about what you need..."
          value={fields.message}
          onChange={set("message")}
          className={`${inputClass} ${fieldErrors.message ? "border-red-500" : ""}`}
        />
        {fieldErrors.message && <p className={errorClass}>{fieldErrors.message}</p>}
      </div>

      {/* API-level error */}
      {status === "error" && (
        <p className="text-red-500 font-inter text-sm">{apiError}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-poppins font-bold uppercase tracking-wider py-4 rounded-md transition-colors disabled:opacity-50 text-sm"
      >
        {status === "loading" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
