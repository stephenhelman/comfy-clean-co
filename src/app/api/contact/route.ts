import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { contactSchema } from "@/lib/schemas/contactSchema";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 h"),
});

export async function POST(req: NextRequest) {
  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";

  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      {
        error:
          "Too many requests. You can submit up to 3 messages per hour. Please try again later.",
      },
      { status: 429 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Zod validation
  const result = contactSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fields: result.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { name, email, phone, service, message } = result.data;
  const firstName = name.split(" ")[0];
  const timestamp = new Date().toLocaleString("en-US", {
    timeZone: "America/Denver",
    dateStyle: "full",
    timeStyle: "short",
  });

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const contactEmail = process.env.CONTACT_EMAIL ?? "info@comfycleanco.com";
    const fromEmail = "noreply@comfycleanco.com";

    await Promise.all([
      // Owner notification
      resend.emails.send({
        from: fromEmail,
        to: contactEmail,
        subject: `New Lead: ${name}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#f9fafb;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:40px;">
      <h1 style="color:#0f172a;font-size:22px;margin-top:0;">New Lead: ${name}</h1>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:120px;">Name</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#0f172a;font-size:14px;font-weight:bold;">${name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Email</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#0f172a;font-size:14px;">${email}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Phone</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#0f172a;font-size:14px;">${phone}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;">Service</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#0f172a;font-size:14px;">${service}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#6b7280;font-size:13px;vertical-align:top;">Message</td>
          <td style="padding:10px 0;color:#0f172a;font-size:14px;line-height:1.6;">${message.replace(/\n/g, "<br>")}</td>
        </tr>
      </table>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px;margin-bottom:0;">Received ${timestamp} (MT)</p>
    </td></tr>
  </table>
</body>
</html>`,
      }),

      // Customer confirmation
      resend.emails.send({
        from: fromEmail,
        to: email,
        subject: `We got your request, ${firstName}!`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="background:#f9fafb;font-family:Arial,sans-serif;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:40px;">
      <h1 style="color:#0f172a;font-size:22px;margin-top:0;">Hi ${firstName}, we got your message!</h1>
      <p style="color:#374151;font-size:16px;line-height:1.7;">
        Thank you for reaching out to <strong>Comfy Clean Co.</strong> We've received your inquiry and a member of our team will be in touch with you within <strong>24 hours</strong>.
      </p>
      <div style="background:#f0fdf4;border-left:3px solid #22c55e;padding:20px;margin:24px 0;border-radius:4px;">
        <p style="color:#374151;font-size:14px;margin:0 0 6px 0;"><strong>Service Requested:</strong> ${service}</p>
        <p style="color:#374151;font-size:14px;margin:0;"><strong>Your Message:</strong> ${message.replace(/\n/g, "<br>")}</p>
      </div>
      <p style="color:#374151;font-size:16px;line-height:1.7;">
        In the meantime, feel free to call or text us directly at <strong style="color:#16a34a;">915-979-5151</strong> — we're happy to chat.
      </p>
      <p style="color:#374151;font-size:16px;line-height:1.7;margin-bottom:0;">
        Talk soon,<br>
        <strong>The Comfy Clean Co. Team</strong>
      </p>
    </td></tr>
    <tr><td style="text-align:center;padding-top:24px;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">Comfy Clean Co. · Far East El Paso, TX · Clean · Fresh · Reliable</p>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("contact route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again or call us directly." },
      { status: 500 }
    );
  }
}
