-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "extensionStatus" TEXT,
ADD COLUMN IF NOT EXISTS "extensionRequestedEndTime" TEXT;
