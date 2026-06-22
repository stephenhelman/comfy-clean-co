import { db } from "@/lib/db";
import { logActivity, ACTIVITY_EVENTS } from "@/lib/activityLog";
import type { Division } from "@/lib/services";

/**
 * The CRM intake contract. This is the exact shape the order ("Book Now") form
 * produces and the only payload the persistence layer accepts. Keep it stable —
 * downstream (CRM) depends on it.
 */
export interface LeadSubmission {
  name: string;
  phone: string;
  email: string;
  address: string;
  division: Division;
  service: string; // service slug from the manifest
  notes?: string;
  lang: "en" | "es";
  source: string; // e.g. "book" | "services/<slug>" | "home-hero"
}

export interface LeadSinkResult {
  id: string;
  duplicate: boolean;
}

/** Swappable persistence target for a captured lead. Current target: the CRM DB. */
export interface LeadSink {
  create(lead: LeadSubmission): Promise<LeadSinkResult>;
}

// The CRM model (LeadInquiry) has no dedicated address/service columns and a
// required `frequency` (we no longer ask for one), so structured detail is
// folded into the notes field. Nothing about the model changes (no migration).
function foldNotes(lead: LeadSubmission): string {
  return [
    `Service: ${lead.service}`,
    `Address: ${lead.address}`,
    lead.notes ? `Notes: ${lead.notes}` : null,
    `Communication language: ${lead.lang === "es" ? "Español" : "English"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Persists leads to the CRM database, reusing the existing LeadInquiry model and
 * the same dedupe + activity-feed surfacing the CRM already relies on.
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

    if (existing) {
      const dupNote = `Duplicate submission on ${new Date().toLocaleDateString("en-US")} (source: ${lead.source}).\n${foldNotes(lead)}`;
      await db.leadInquiry.update({
        where: { id: existing.id },
        data: { notes: existing.notes ? `${existing.notes}\n${dupNote}` : dupNote },
      });
      return { id: existing.id, duplicate: true };
    }

    const created = await db.leadInquiry.create({
      data: {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        type: lead.division,
        frequency: "unspecified", // form no longer captures frequency; column is required
        source: lead.source,
        notes: foldNotes(lead),
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
