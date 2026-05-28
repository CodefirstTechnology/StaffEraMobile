const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

const ACTIVE_STATUSES = ["CONFIRMED", "ACTIVE"];

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
      status: { in: ACTIVE_STATUSES },
      sessionDate: { gte: dayStart, lte: dayEnd },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {})
    }
  });

  for (const b of existing) {
    if (
      rangesOverlap(
        b.sessionStartTime,
        b.sessionEndTime,
        bookingData.sessionStartTime,
        bookingData.sessionEndTime
      )
    ) {
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
      status: { in: ACTIVE_STATUSES },
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

const checkBookingConflict = async (servantId, bookingData, excludeBookingId) => {
  if (bookingData.bookingType === "SESSION") {
    const conflict = await checkSessionConflict(
      servantId,
      bookingData,
      excludeBookingId
    );
    if (conflict) {
      throw new ApiError(409, "Servant is already booked for this session time");
    }
  }

  if (bookingData.bookingType === "MONTHLY") {
    const conflict = await checkMonthlyConflict(
      servantId,
      bookingData,
      excludeBookingId
    );
    if (conflict) {
      throw new ApiError(409, "Servant has a conflicting monthly booking");
    }
  }
};

module.exports = {
  checkBookingConflict,
  parseJsonArray,
  ACTIVE_STATUSES
};
