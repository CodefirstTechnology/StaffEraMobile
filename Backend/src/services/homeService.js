const prisma = require("../config/prisma");
const { isAadhaarVerificationRequired } = require("../config/features");
const {
  findServantsNearLocation,
  bookingMatchesServantSkill
} = require("./locationService");
const {
  filterServantsAvailableForBooking,
  toConflictData,
  expireStaleSessionBookings,
  normalizeBookingRow
} = require("./bookingService");

const isServantEligibleForArea = (servant) => {
  if (servant.verificationStatus !== "VERIFIED") return false;
  if (!servant.user?.isActive) return false;
  if (isAadhaarVerificationRequired() && !servant.aadhaarVerified) return false;
  if (!Array.isArray(servant.zones) || servant.zones.length === 0) return false;
  return true;
};

const filterAreaEligibleServants = (servants) =>
  servants.filter(isServantEligibleForArea);

/** Active helpers near a point who are verified, onboarded, and not on an open clock-in. */
const countEligibleHelpersNear = async (latitude, longitude) => {
  const nearby = filterAreaEligibleServants(
    await findServantsNearLocation(latitude, longitude, {})
  );
  if (nearby.length === 0) return 0;

  const openEntries = await prisma.timeEntry.findMany({
    where: {
      servantId: { in: nearby.map((s) => s.id) },
      clockOut: null
    },
    select: { servantId: true }
  });
  const onDuty = new Set(openEntries.map((row) => row.servantId));
  return nearby.filter((servant) => !onDuty.has(servant.id)).length;
};

const getDeclinedServantIds = async (bookingId) => {
  const rows = await prisma.openRequestDecline.findMany({
    where: { bookingId },
    select: { servantId: true }
  });
  return new Set(rows.map((row) => row.servantId));
};

const getAvailableHelpersForOpenBooking = async (booking) => {
  if (booking.latitude == null || booking.longitude == null) {
    return [];
  }

  const nearby = filterAreaEligibleServants(
    await findServantsNearLocation(booking.latitude, booking.longitude, {
      skill: booking.requestedSkill || undefined
    })
  ).filter((servant) => bookingMatchesServantSkill(booking, servant));

  const declinedServantIds = await getDeclinedServantIds(booking.id);
  const notDeclined = nearby.filter((servant) => !declinedServantIds.has(servant.id));

  return filterServantsAvailableForBooking(
    notDeclined,
    toConflictData(booking),
    booking.id
  );
};

const buildHomeSummary = async ({ houseOwnerId, latitude, longitude }) => {
  await expireStaleSessionBookings({ houseOwnerId });

  const hasLocation =
    latitude != null &&
    longitude != null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  const eligibleHelperCount = hasLocation
    ? await countEligibleHelpersNear(Number(latitude), Number(longitude))
    : 0;

  const openCandidates = await prisma.booking.findMany({
    where: {
      houseOwnerId,
      status: "PENDING",
      servantId: null
    },
    orderBy: { createdAt: "desc" }
  });

  const openInquiries = [];
  for (const booking of openCandidates) {
    const availableHelpers = await getAvailableHelpersForOpenBooking(booking);
    if (availableHelpers.length === 0) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "EXPIRED" }
      });
      continue;
    }

    const declinedCount = (await getDeclinedServantIds(booking.id)).size;

    openInquiries.push({
      id: booking.id,
      status: booking.status,
      bookingType: booking.bookingType,
      requestedSkill: booking.requestedSkill,
      sessionDate: booking.sessionDate,
      sessionStartTime: booking.sessionStartTime,
      sessionEndTime: booking.sessionEndTime,
      sessionSlots: booking.sessionSlots,
      createdAt: booking.createdAt,
      eligibleHelperCount: availableHelpers.length,
      declinedCount,
      canAcceptResponses: true
    });
  }

  return {
    eligibleHelperCount,
    openInquiries: openInquiries.map(normalizeBookingRow),
    locationRequired: !hasLocation
  };
};

module.exports = {
  buildHomeSummary,
  countEligibleHelpersNear,
  getAvailableHelpersForOpenBooking,
  isServantEligibleForArea
};
