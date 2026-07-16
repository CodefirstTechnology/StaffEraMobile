-- AlterTable
ALTER TABLE "Servant" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "statusReason" TEXT,
ADD COLUMN "statusChangedAt" TIMESTAMP(3);
