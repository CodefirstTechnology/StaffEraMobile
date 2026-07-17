-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneCountryCode" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "User_phone_key";
