import { db } from "@/lib/db";
import { logActivity, ACTIVITY_EVENTS } from "@/lib/activityLog";
import type { Division } from "@/lib/services";

/**
 * The CRM intake contract. This is the exact shape the order ("Book Now") form
 * produces and the only payload the persistence layer accepts. Keep it stable —
 * downstream (CRM) depends on it.
 *
 * Note: address is intentionally NOT collected by the public form — the admin
 * fills LeadInquiry.address later (Google Places). It is absent here by design.
 */
export interface LeadSubmission {
  name: string;
  phone: string;
  email: string;
  division: Division;
  service: string; // service slug from the manifest
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
  lang: "en" | "es";
  source: string; // e.g. "book" | "home" | "home-hero" | "services-page" | "about" | "services/<slug>"
  /**
   * Website SMS consent — covers TRANSACTIONAL/service messages only
   * (confirmations, reminders, service updates), not marketing. true sets
   * smsOptedIn at create; false leaves the SMS fields at their defaults. The
   * website path never sets smsOptInSent* (that's the admin invite path).
   */
  smsConsent: boolean;
}

export interface LeadSinkResult {
  id: string;
  duplicate: boolean;
}

/** Swappable persistence target for a captured lead. Current target: the CRM DB. */
export interface LeadSink {
  create(lead: LeadSubmission): Promise<LeadSinkResult>;
}

// `notes` now holds real user notes only (+ comms language, which has no column).
// service/division/date/time all map to real columns — no more folding.
function buildNotes(lead: LeadSubmission): string | null {
  const langLine = `Communication language: ${lead.lang === "es" ? "Español" : "English"}`;
  const parts = [lead.notes?.trim() || null, langLine].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

/**
 * Persists leads to the CRM database, reusing the existing LeadInquiry model and
 * the same dedupe + activity-feed surfacing the CRM already relies on. `frequency`
 * is left null (relaxed in the 1a-final migration; the form no longer collects it).
 */
export const crmLeadSink: LeadSink = {
  async create(lead) {
    // Duplicate detection — same email or phone with an open lead.
    const existing = await db.leadInquiry.findFirst({
      where: {
        OR: [{ email: lead.email }, { phone: lead.phone }],
        status: { notIn: ["converted", "lost"] },
      },
    });

    // Website consent → transactional SMS opt-in, written atomically with the lead.
    // Only ever sets the opt-in fields from the website; never smsOptInSent*.
    const smsOptIn = lead.smsConsent
      ? { smsOptedIn: true, smsOptedInAt: new Date() }
      : {};

    if (existing) {
      const dupNote = `Duplicate submission on ${new Date().toLocaleDateString("en-US")} (source: ${lead.source}, service: ${lead.service}).`;
      await db.leadInquiry.update({
        where: { id: existing.id },
        data: {
          notes: existing.notes ? `${existing.notes}\n${dupNote}` : dupNote,
          // Honor a fresh opt-in on a returning lead, but don't override an opt-out.
          ...(lead.smsConsent && !existing.smsOptedOut ? smsOptIn : {}),
        },
      });
      return { id: existing.id, duplicate: true };
    }

    const created = await db.leadInquiry.create({
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        type: lead.division,
        service: lead.service,
        preferredDay: lead.preferredDate || null,
        preferredTime: lead.preferredTime || null,
        source: lead.source,
        notes: buildNotes(lead),
        ...smsOptIn,
      },
    });

    await logActivity({
      eventType: ACTIVITY_EVENTS.LEAD_SUBMITTED,
      description: `New booking request from ${lead.name}`,
      linkPath: `/leads/${created.id}`,
    });

    return { id: created.id, duplicate: false };
  },
};
