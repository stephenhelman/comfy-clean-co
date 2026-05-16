-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN     "clockOutGpsBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "clockOutGpsLat" DOUBLE PRECISION,
ADD COLUMN     "clockOutGpsLng" DOUBLE PRECISION;
