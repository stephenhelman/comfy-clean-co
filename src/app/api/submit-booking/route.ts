import { NextRequest, NextResponse } from "next/server";
import { sendToGoogleSheets } from "@/lib/googleSheets";
import { sendCustomerConfirmation, sendBusinessNotification } from "@/lib/email";
import { BookingData } from "@/lib/services";

export async function POST(req: NextRequest) {
  try {
    const data: BookingData = await req.json();

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
