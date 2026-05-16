-- CreateTable
CREATE TABLE "CleanerSession" (
    "id" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceHint" TEXT,

    CONSTRAINT "CleanerSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CleanerSession_cleanerId_key" ON "CleanerSession"("cleanerId");

-- CreateIndex
CREATE INDEX "CleanerSession_cleanerId_idx" ON "CleanerSession"("cleanerId");

-- CreateIndex
CREATE INDEX "CleanerSession_expiresAt_idx" ON "CleanerSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "CleanerSession" ADD CONSTRAINT "CleanerSession_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "Cleaner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
