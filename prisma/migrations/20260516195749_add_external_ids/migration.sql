-- AlterTable
ALTER TABLE "Cleaner" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN     "flatRatePay" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Cleaner_externalId_idx" ON "Cleaner"("externalId");

-- CreateIndex
CREATE INDEX "Client_externalId_idx" ON "Client"("externalId");

-- CreateIndex
CREATE INDEX "Job_externalId_idx" ON "Job"("externalId");
