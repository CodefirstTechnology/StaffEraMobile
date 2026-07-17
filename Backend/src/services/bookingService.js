const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");

/** Block new bookings when these already occupy the servant's schedule. */
const BLOCKING_STATUSES = ["PENDING", "CONFIRMED", "ACTIVE"];

/** Map legacy DB statuses so list queries never crash the Prisma client. */
const normalizeBookingStatus = (status) => {
  if (status === "OTP_PENDING" || status === "ARRIVED") return "CONFIRMED";
  return status;
};

const normalizeBookingRow = (booking) =>
  booking ? { ...booking, status: normalizeBookingStatus(booking.status) } : booking;

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

const getSessionEndAt = (booking) => {
  if (booking.bookingType !== "SESSION" || !booking.sessionDate) return null;
  const endTime = booking.sessionEndTime || "23:59";
  const [h, m] = endTime.split(":").map(Number);
  const endAt = new Date(booking.sessionDate);
  endAt.setHours(h, m || 0, 0, 0);
  return endAt;
};

const isSessionPast = (booking, now = new Date()) => {
  const endAt = getSessionEndAt(booking);
  return endAt ? endAt.getTime() <= now.getTime() : false;
};

const computeBookingEarnings = (booking, hourlyRate) => {
  if (booking.totalAmount != null && booking.totalAmount > 0) {
    return booking.totalAmount;
  }
  const rate = hourlyRate || 0;
  if (!rate) return 0;

  const entries = booking.timeEntries || [];
  const hoursFromEntries = entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);
  if (hoursFromEntries > 0) {
    return Math.round(hoursFromEntries * rate * 100) / 100;
  }

  if (booking.sessionHours && booking.sessionHours > 0) {
    return Math.round(booking.sessionHours * rate * 100) / 100;
  }

  return 0;
};

const resolveExpiredSessionStatus = (booking) => {
  if (!["PENDING", "CONFIRMED", "ACTIVE"].includes(booking.status)) return null;
  if (booking.bookingType !== "SESSION" || !isSessionPast(booking)) return null;

  const hasWork = Array.isArray(booking.timeEntries) && booking.timeEntries.length > 0;
  if (booking.status === "PENDING") return "EXPIRED";
  return hasWork ? "COMPLETED" : "EXPIRED";
};

const expireStaleSessionBookings = async (whereExtra = {}) => {
  const candidates = await prisma.booking.findMany({
    where: {
      bookingType: "SESSION",
      status: { in: BLOCKING_STATUSES },
      sessionDate: { not: null },
      ...whereExtra
    },
    include: {
      timeEntries: true,
      servant: { select: { hourlyRate: true } }
    }
  });

  for (const booking of candidates) {
    const nextStatus = resolveExpiredSessionStatus(booking);
    if (!nextStatus) continue;

    const totalAmount =
      nextStatus === "COMPLETED"
        ? computeBookingEarnings(booking, booking.servant?.hourlyRate)
        : booking.totalAmount;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: nextStatus,
        ...(totalAmount != null && totalAmount > 0 ? { totalAmount } : {})
      }
    });
  }
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

  const conflict = await hasServantScheduleConflict(
    servantId,
    bookingData,
    excludeBookingId
  );
  if (conflict) {
    if (bookingData.bookingType === "SESSION") {
      throw new ApiError(
        409,
        "This helper is not available for that visit time. Choose another date, time, or helper."
      );
    }
    if (bookingData.bookingType === "MONTHLY") {
      throw new ApiError(
        409,
        "This helper already has a monthly booking in that period. Choose different dates or another helper."
      );
    }
    throw new ApiError(409, "This helper is not available for that time.");
  }
};

const toConflictData = (booking) => ({
  bookingType: booking.bookingType,
  sessionDate: booking.sessionDate,
  sessionStartTime: booking.sessionStartTime,
  sessionEndTime: booking.sessionEndTime,
  sessionSlots: booking.sessionSlots,
  monthlyStartDate: booking.monthlyStartDate,
  monthlyEndDate: booking.monthlyEndDate,
  workingDays: booking.workingDays,
  hoursPerDay: booking.hoursPerDay
});

/** True when the servant already has a pending/confirmed/active booking overlapping this slot. */
const hasServantScheduleConflict = async (servantId, bookingData, excludeBookingId) => {
  if (bookingData.bookingType === "SESSION") {
    return checkSessionConflict(servantId, bookingData, excludeBookingId);
  }
  if (bookingData.bookingType === "MONTHLY") {
    return checkMonthlyConflict(servantId, bookingData, excludeBookingId);
  }
  return false;
};

const servantOffersBookingType = (servant, bookingData) =>
  (bookingData.bookingType === "SESSION" && servant.offersSession) ||
  (bookingData.bookingType === "MONTHLY" && servant.offersMonthly);

/** Keep only servants who offer this booking type and have no schedule overlap. */
const filterServantsAvailableForBooking = async (
  servants,
  bookingData,
  excludeBookingId
) => {
  const results = await Promise.all(
    servants.map(async (servant) => {
      if (!servantOffersBookingType(servant, bookingData)) return null;
      const busy = await hasServantScheduleConflict(
        servant.id,
        bookingData,
        excludeBookingId
      );
      return busy ? null : servant;
    })
  );
  return results.filter(Boolean);
};

module.exports = {
  checkBookingConflict,
  hasServantScheduleConflict,
  filterServantsAvailableForBooking,
  toConflictData,
  servantOffersBookingType,
  parseJsonArray,
  getBookingSlots,
  getSessionEndAt,
  isSessionPast,
  computeBookingEarnings,
  expireStaleSessionBookings,
  normalizeBookingStatus,
  normalizeBookingRow,
  BLOCKING_STATUSES
};
