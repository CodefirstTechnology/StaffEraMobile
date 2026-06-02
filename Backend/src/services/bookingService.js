const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

/** Block new bookings when these already occupy the servant's schedule. */
const BLOCKING_STATUSES = ["PENDING", "CONFIRMED", "ACTIVE"];

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return String(value)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
};

const rangesOverlap = (startA, endA, startB, endB) =>
  timeToMinutes(startA) < timeToMinutes(endB) &&
  timeToMinutes(endA) > timeToMinutes(startB);

const getBookingSlots = (booking) => {
  const parsed = parseJsonArray(booking.sessionSlots);
  if (parsed.length && parsed[0]?.start && parsed[0]?.end) {
    return parsed;
  }
  if (booking.sessionStartTime && booking.sessionEndTime) {
    return [{ start: booking.sessionStartTime, end: booking.sessionEndTime }];
  }
  return [];
};

const slotsConflict = (slotsA, slotsB) =>
  slotsA.some((slotA) =>
    slotsB.some((slotB) =>
      rangesOverlap(slotA.start, slotA.end, slotB.start, slotB.end)
    )
  );

const daysOverlap = (daysA, daysB) => {
  const a = parseJsonArray(daysA).map((d) => d.toUpperCase());
  const b = parseJsonArray(daysB).map((d) => d.toUpperCase());
  return a.some((day) => b.includes(day));
};

const dateRangesOverlap = (startA, endA, startB, endB) => {
  const aStart = new Date(startA);
  const aEnd = new Date(endA);
  const bStart = new Date(startB);
  const bEnd = new Date(endB);
  return aStart <= bEnd && aEnd >= bStart;
};

const checkSessionConflict = async (servantId, bookingData, excludeBookingId) => {
  const sessionDate = new Date(bookingData.sessionDate);
  const dayStart = new Date(sessionDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(sessionDate);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.booking.findMany({
    where: {
      servantId,
      bookingType: "SESSION",
      status: { in: BLOCKING_STATUSES },
      sessionDate: { gte: dayStart, lte: dayEnd },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {})
    }
  });

  const incomingSlots = getBookingSlots(bookingData);

  for (const b of existing) {
    const existingSlots = getBookingSlots(b);
    if (slotsConflict(incomingSlots, existingSlots)) {
      return true;
    }
  }
  return false;
};

const checkMonthlyConflict = async (servantId, bookingData, excludeBookingId) => {
  const existing = await prisma.booking.findMany({
    where: {
      servantId,
      bookingType: "MONTHLY",
      status: { in: BLOCKING_STATUSES },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {})
    }
  });

  for (const b of existing) {
    const datesOverlap = dateRangesOverlap(
      b.monthlyStartDate,
      b.monthlyEndDate,
      bookingData.monthlyStartDate,
      bookingData.monthlyEndDate
    );

    if (!datesOverlap) continue;

    const wdOverlap = daysOverlap(b.workingDays, bookingData.workingDays);
    if (!wdOverlap) continue;

    const hoursOverlap =
      (b.hoursPerDay || 8) > 0 && (bookingData.hoursPerDay || 8) > 0;

    if (hoursOverlap) return true;
  }
  return false;
};

const checkOwnerPendingDuplicate = async (houseOwnerId, servantId, bookingData) => {
  const pending = await prisma.booking.findMany({
    where: {
      houseOwnerId,
      servantId,
      status: "PENDING"
    }
  });

  for (const b of pending) {
    if (bookingData.bookingType === "SESSION" && b.bookingType === "SESSION") {
      const sameDay =
        b.sessionDate &&
        bookingData.sessionDate &&
        new Date(b.sessionDate).toDateString() ===
          new Date(bookingData.sessionDate).toDateString();
      if (
        sameDay &&
        slotsConflict(getBookingSlots(b), getBookingSlots(bookingData))
      ) {
        return true;
      }
    }
    if (bookingData.bookingType === "MONTHLY" && b.bookingType === "MONTHLY") {
      if (
        dateRangesOverlap(
          b.monthlyStartDate,
          b.monthlyEndDate,
          bookingData.monthlyStartDate,
          bookingData.monthlyEndDate
        ) &&
        daysOverlap(b.workingDays, bookingData.workingDays)
      ) {
        return true;
      }
    }
  }
  return false;
};

const checkBookingConflict = async (
  servantId,
  bookingData,
  excludeBookingId,
  houseOwnerId
) => {
  if (houseOwnerId) {
    const ownPending = await checkOwnerPendingDuplicate(
      houseOwnerId,
      servantId,
      bookingData
    );
    if (ownPending) {
      throw new ApiError(
        409,
        "You already have a pending request for this helper at this time. Check My Bookings or pick a different slot."
      );
    }
  }

  if (bookingData.bookingType === "SESSION") {
    const conflict = await checkSessionConflict(
      servantId,
      bookingData,
      excludeBookingId
    );
    if (conflict) {
      throw new ApiError(
        409,
        "This helper is not available for that visit time. Choose another date, time, or helper."
      );
    }
  }

  if (bookingData.bookingType === "MONTHLY") {
    const conflict = await checkMonthlyConflict(
      servantId,
      bookingData,
      excludeBookingId
    );
    if (conflict) {
      throw new ApiError(
        409,
        "This helper already has a monthly booking in that period. Choose different dates or another helper."
      );
    }
  }
};

module.exports = {
  checkBookingConflict,
  parseJsonArray,
  getBookingSlots,
  BLOCKING_STATUSES
};
