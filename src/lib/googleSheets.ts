import { BookingData } from "./services";

export async function sendToGoogleSheets(data: BookingData): Promise<void> {
  const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl === "your_google_apps_script_url_here") {
    console.warn("GOOGLE_SHEETS_WEBHOOK_URL not configured — skipping sheet entry.");
    return;
  }
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        serviceType: data.serviceType,
        frequency: data.frequency,
        homeSize: data.homeSize,
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
        notes: data.notes,
        languagePreference: data.languagePreference,
      }),
    });
  } catch (err) {
    console.error("Failed to send to Google Sheets:", err);
  }
}
