-- CreateTable
CREATE TABLE "OpenRequestDecline" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "servantId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenRequestDecline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpenRequestDecline_servantId_idx" ON "OpenRequestDecline"("servantId");

-- CreateIndex
CREATE UNIQUE INDEX "OpenRequestDecline_bookingId_servantId_key" ON "OpenRequestDecline"("bookingId", "servantId");

-- AddForeignKey
ALTER TABLE "OpenRequestDecline" ADD CONSTRAINT "OpenRequestDecline_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenRequestDecline" ADD CONSTRAINT "OpenRequestDecline_servantId_fkey" FOREIGN KEY ("servantId") REFERENCES "Servant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
