-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "payPeriodFrequency" TEXT NOT NULL DEFAULT 'biweekly',
ADD COLUMN     "payPeriodStartDay" INTEGER NOT NULL DEFAULT 1;
