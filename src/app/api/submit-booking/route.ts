import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { db } from "@/lib/db";
import { logActivity, ACTIVITY_EVENTS } from "@/lib/activityLog";
import { sendCustomerConfirmation, sendBusinessNotification } from "@/lib/email";
import { BookingData } from "@/lib/services";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Honeypot — silent 200 for bots
  if (body.website) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
  const { success } = await ratelimit.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const data = body as BookingData;

    const required = ["name", "phone", "email", "address", "serviceType", "frequency", "homeSize", "preferredDate", "preferredTime"];
    for (const field of required) {
      if (!data[field as keyof BookingData]) {
        return NextResponse.json({ ok: false, error: `Missing field: ${field}` }, { status: 400 });
      }
    }

    // Duplicate detection — same email or phone with an open lead
    const existing = await db.leadInquiry.findFirst({
      where: {
        OR: [{ email: data.email }, { phone: data.phone }],
        status: { notIn: ["converted", "lost"] },
      },
    });

    if (existing) {
      const dupNote = `Duplicate booking submission received on ${new Date().toLocaleDateString("en-US")}. Address: ${data.address}, Home size: ${data.homeSize}.`;
      await db.leadInquiry.update({
        where: { id: existing.id },
        data: { notes: existing.notes ? `${existing.notes}\n${dupNote}` : dupNote },
      });
    } else {
      const notes = [
        `Address: ${data.address}`,
        `Home size: ${data.homeSize}`,
        data.notes ? `Notes: ${data.notes}` : null,
        data.languagePreference ? `Language preference: ${data.languagePreference}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const lead = await db.leadInquiry.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          type: data.serviceType,
          frequency: data.frequency,
          preferredDay: data.preferredDate,
          preferredTime: data.preferredTime,
          source: "website_booking",
          notes: notes || null,
        },
      });

      await logActivity({
        eventType: ACTIVITY_EVENTS.LEAD_SUBMITTED,
        description: `New booking request from ${data.name}`,
        linkPath: `/leads/${lead.id}`,
      });
    }

    await Promise.all([
      sendCustomerConfirmation(data),
      sendBusinessNotification(data),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("submit-booking error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
