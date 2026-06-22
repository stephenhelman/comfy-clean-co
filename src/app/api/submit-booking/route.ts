import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { sendCustomerConfirmation, sendBusinessNotification } from "@/lib/email";
import { crmLeadSink, type LeadSubmission } from "@/lib/leadSink";
import { getServiceBySlug } from "@/lib/services";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
});

const REQUIRED: (keyof LeadSubmission)[] = ["name", "phone", "email", "address", "division", "service"];

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Honeypot — silent 200 for bots
  if (body.website) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { ok: false, error: "Too many booking attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    for (const field of REQUIRED) {
      if (!body[field]) {
        return NextResponse.json({ ok: false, error: `Missing field: ${field}` }, { status: 400 });
      }
    }

    // Validate against the manifest so service/division stay in sync with the source of truth.
    const svc = getServiceBySlug(body.service);
    if (!svc || svc.division !== body.division) {
      return NextResponse.json({ ok: false, error: "Invalid service selection" }, { status: 400 });
    }

    const lead: LeadSubmission = {
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      division: body.division,
      service: body.service,
      notes: body.notes || undefined,
      lang: body.lang === "es" ? "es" : "en",
      source: typeof body.source === "string" && body.source ? body.source : "book",
    };

    await crmLeadSink.create(lead);

    await Promise.all([sendCustomerConfirmation(lead), sendBusinessNotification(lead)]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("submit-booking error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
