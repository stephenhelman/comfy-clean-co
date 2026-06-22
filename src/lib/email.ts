import { getTranslations } from "next-intl/server";
import type { LeadSubmission } from "./leadSink";
import { getBusinessPhone } from "./businessData";
import { formatPhone } from "./businessInfo";

async function serviceLabel(lang: "en" | "es", slug: string): Promise<string> {
  try {
    const t = await getTranslations({ locale: lang, namespace: "services.items" });
    return t(`${slug}.title`);
  } catch {
    // Fallback: prettify the slug if the key is missing.
    return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
}

export async function sendCustomerConfirmation(data: LeadSubmission): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://comfycleanco.com";
  const fromEmail = process.env.EMAIL_NOREPLY ?? "noreply@comfycleanco.com";
  const isSpanish = data.lang === "es";
  const service = await serviceLabel(data.lang, data.service);
  const phone = formatPhone(await getBusinessPhone());

  const row = (label: string, value: string) =>
    `<p style="color:#DCEFE0;margin:4px 0;"><strong style="color:#FFFFFF;">${label}:</strong> ${value}</p>`;
  const detailRows = [
    row(isSpanish ? "Servicio" : "Service", service),
    data.preferredDate ? row(isSpanish ? "Fecha Preferida" : "Preferred Date", data.preferredDate) : "",
    data.preferredTime ? row(isSpanish ? "Hora Preferida" : "Preferred Time", data.preferredTime) : "",
  ].join("");

  const subject = isSpanish
    ? "Recibimos tu solicitud de servicio — Comfy Clean Co"
    : "Your booking request was received — Comfy Clean Co";

  const greeting = isSpanish ? `¡Hola, ${data.name}!` : `Hi ${data.name}!`;
  const intro = isSpanish
    ? "Recibimos tu solicitud de visita y nos pondremos en contacto contigo dentro de las próximas <strong style=\"color:#FFFFFF;\">24 horas</strong> para confirmar tu cita."
    : "We received your booking request and will call you within the next <strong style=\"color:#FFFFFF;\">24 hours</strong> to confirm your visit.";
  const requestHeading = isSpanish ? "Tu Solicitud" : "Your Request";
  const questions = isSpanish ? "¿Tienes preguntas? Llámanos directamente:" : "Have questions? Call us directly:";
  const tagline = isSpanish
    ? "Comfy Clean Co. · Este de El Paso, TX · Limpio · Fresco · Confiable"
    : "Comfy Clean Co. · Far East El Paso, TX · Clean · Fresh · Reliable";

  // Brand navy/green theme (matches the OG card). No more sky-blue.
  const bodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#1A3A4A;color:#DCEFE0;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr><td style="text-align:center;padding-bottom:32px;">
      <img src="${siteUrl}/images/brand/logo-white.png" alt="Comfy Clean Co." width="160" style="max-width:160px;" />
    </td></tr>
    <tr><td style="background:#2B5C78;border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:40px;">
      <h1 style="color:#FFFFFF;font-size:24px;margin-top:0;">${greeting}</h1>
      <p style="color:#DCEFE0;font-size:16px;line-height:1.6;">${intro}</p>
      <div style="background:rgba(255,255,255,0.06);border-left:4px solid #51A755;padding:20px;margin:24px 0;border-radius:6px;">
        <h3 style="color:#6DC272;margin-top:0;font-size:14px;text-transform:uppercase;letter-spacing:2px;">${requestHeading}</h3>
        ${detailRows}
      </div>
      <p style="color:#DCEFE0;font-size:16px;">${questions}</p>
      <p style="color:#6DC272;font-size:18px;font-weight:bold;">${phone}</p>
    </td></tr>
    <tr><td style="text-align:center;padding-top:24px;">
      <p style="color:rgba(255,255,255,0.5);font-size:12px;">${tagline}</p>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: fromEmail,
    to: data.email,
    subject,
    html: bodyHtml,
  });
}

export async function sendBusinessNotification(data: LeadSubmission): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const businessEmail = process.env.EMAIL_SCHEDULING ?? "scheduling@comfycleanco.com";
  const fromEmail = process.env.EMAIL_NOREPLY ?? "noreply@comfycleanco.com";
  const service = await serviceLabel("en", data.service);

  const subject = `New Booking Request — ${data.name} — ${service}`;

  const body = `
New Booking Request
===================
Timestamp:    ${new Date().toISOString()}
Name:         ${data.name}
Phone:        ${data.phone}
Email:        ${data.email}
Division:     ${data.division}
Service:      ${data.service}
Preferred:    ${[data.preferredDate, data.preferredTime].filter(Boolean).join(" ") || "(no preference)"}
Language:     ${data.lang}
Source:       ${data.source}
Notes:        ${data.notes || "(none)"}
`.trim();

  await resend.emails.send({
    from: fromEmail,
    to: businessEmail,
    subject,
    text: body,
  });
}
