-- Sprint 1a-final: marketing order-form CRM intake contract.
-- Additive + constraint-relaxing only; no backfill (site is unused).

-- Service slug from the marketing manifest (folded into notes before this).
ALTER TABLE "LeadInquiry" ADD COLUMN "service" TEXT;

-- Address is collected by admin later; public order form no longer captures it.
ALTER TABLE "LeadInquiry" ADD COLUMN "address" TEXT;

-- Frequency is vestigial — the public order form no longer offers a choice.
ALTER TABLE "LeadInquiry" ALTER COLUMN "frequency" DROP NOT NULL;
