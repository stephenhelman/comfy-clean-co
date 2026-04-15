import { BookingData } from "./services";

export async function sendCustomerConfirmation(data: BookingData): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://comfycleanco.com";
  const fromEmail = process.env.EMAIL_NOREPLY ?? "noreply@comfycleanco.com";
  const isSpanish = data.languagePreference === "Español";

  const subject = isSpanish
    ? "Recibimos tu solicitud de servicio — Comfy Clean Co"
    : "Your booking request was received — Comfy Clean Co";

  const bodyHtml = isSpanish
    ? `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0A0A0A;color:#D1D5DB;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr><td style="text-align:center;padding-bottom:32px;">
      <img src="${siteUrl}/images/brand/logo-white.png" alt="Comfy Clean Co." width="160" style="max-width:160px;" />
    </td></tr>
    <tr><td style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:8px;padding:40px;">
      <h1 style="color:#5BB8E8;font-size:24px;margin-top:0;">¡Hola, ${data.name}!</h1>
      <p style="color:#D1D5DB;font-size:16px;line-height:1.6;">
        Recibimos tu solicitud de visita y nos pondremos en contacto contigo dentro de las próximas <strong style="color:#FFFFFF;">24 horas</strong> para confirmar tu cita.
      </p>
      <div style="background:#111111;border-left:3px solid #5BB8E8;padding:20px;margin:24px 0;border-radius:4px;">
        <h3 style="color:#5BB8E8;margin-top:0;font-size:14px;text-transform:uppercase;letter-spacing:2px;">Tu Solicitud</h3>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Servicio:</strong> ${data.serviceType}</p>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Frecuencia:</strong> ${data.frequency}</p>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Dirección:</strong> ${data.address}</p>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Fecha Preferida:</strong> ${data.preferredDate}</p>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Hora Preferida:</strong> ${data.preferredTime}</p>
      </div>
      <p style="color:#D1D5DB;font-size:16px;">¿Tienes preguntas? Llámanos directamente:</p>
      <p style="color:#5BB8E8;font-size:18px;font-weight:bold;">[PLACEHOLDER — cliente debe proporcionar]</p>
    </td></tr>
    <tr><td style="text-align:center;padding-top:24px;">
      <p style="color:#6B7280;font-size:12px;">Comfy Clean Co. · Este de El Paso, TX · Clean · Fresh · Reliable</p>
    </td></tr>
  </table>
</body>
</html>`
    : `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#0A0A0A;color:#D1D5DB;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr><td style="text-align:center;padding-bottom:32px;">
      <img src="${siteUrl}/images/brand/logo-white.png" alt="Comfy Clean Co." width="160" style="max-width:160px;" />
    </td></tr>
    <tr><td style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:8px;padding:40px;">
      <h1 style="color:#5BB8E8;font-size:24px;margin-top:0;">Hi ${data.name}!</h1>
      <p style="color:#D1D5DB;font-size:16px;line-height:1.6;">
        We received your booking request and will call you within the next <strong style="color:#FFFFFF;">24 hours</strong> to confirm your visit.
      </p>
      <div style="background:#111111;border-left:3px solid #5BB8E8;padding:20px;margin:24px 0;border-radius:4px;">
        <h3 style="color:#5BB8E8;margin-top:0;font-size:14px;text-transform:uppercase;letter-spacing:2px;">Your Request</h3>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Service:</strong> ${data.serviceType}</p>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Frequency:</strong> ${data.frequency}</p>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Address:</strong> ${data.address}</p>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Preferred Date:</strong> ${data.preferredDate}</p>
        <p style="color:#C0C0C0;margin:4px 0;"><strong style="color:#FFFFFF;">Preferred Time:</strong> ${data.preferredTime}</p>
      </div>
      <p style="color:#D1D5DB;font-size:16px;">Have questions? Call us directly:</p>
      <p style="color:#5BB8E8;font-size:18px;font-weight:bold;">915-979-5151</p>
    </td></tr>
    <tr><td style="text-align:center;padding-top:24px;">
      <p style="color:#6B7280;font-size:12px;">Comfy Clean Co. · Far East El Paso, TX · Clean · Fresh · Reliable</p>
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

export async function sendBusinessNotification(data: BookingData): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const businessEmail = process.env.EMAIL_SCHEDULING ?? "scheduling@comfycleanco.com";
  const fromEmail = process.env.EMAIL_NOREPLY ?? "noreply@comfycleanco.com";

  const subject = `New Booking Request — ${data.name} — ${data.serviceType}`;

  const body = `
New Booking Request
===================
Timestamp:    ${new Date().toISOString()}
Name:         ${data.name}
Phone:        ${data.phone}
Email:        ${data.email}
Address:      ${data.address}
Service Type: ${data.serviceType}
Frequency:    ${data.frequency}
Home Size:    ${data.homeSize}
Date:         ${data.preferredDate}
Time:         ${data.preferredTime}
Language:     ${data.languagePreference}
Notes:        ${data.notes || "(none)"}
`.trim();

  await resend.emails.send({
    from: fromEmail,
    to: businessEmail,
    subject,
    text: body,
  });
}
