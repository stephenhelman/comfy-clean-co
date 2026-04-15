import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { sendToGoogleSheets } from "@/lib/googleSheets";
import { sendCustomerConfirmation, sendBusinessNotification } from "@/lib/email";
import { BookingData } from "@/lib/services";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
});

export async function POST(req: NextRequest) {
  // Parse body
  const body = await req.json();

  // Honeypot check — silent 200 for bots, no Upstash call wasted
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

    await sendToGoogleSheets(data);

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
