const prisma = require("../config/prisma");
const logger = require("../utils/logger");

const createNotification = async ({ userId, title, body, type, data }) => {
  try {
    return await prisma.notification.create({
      data: { userId, title, body, type, data: data || undefined }
    });
  } catch (err) {
    logger.error("Failed to create notification", { err: err.message, userId, type });
    return null;
  }
};

/** Servants who received the open-request alert for this booking (BOOKING_OPEN). */
const findUsersNotifiedForOpenBooking = async (bookingId) => {
  const rows = await prisma.notification.findMany({
    where: {
      type: "BOOKING_OPEN",
      data: {
        path: ["bookingId"],
        equals: bookingId
      }
    },
    select: { userId: true }
  });
  return [...new Set(rows.map((row) => row.userId))];
};

const WORK_COMPLETED_TYPE = "WORK_COMPLETED";

const hasWorkCompletedNotification = async (timeEntryId) => {
  const existing = await prisma.notification.findFirst({
    where: {
      type: WORK_COMPLETED_TYPE,
      data: {
        path: ["timeEntryId"],
        equals: timeEntryId
      }
    },
    select: { id: true }
  });
  return Boolean(existing);
};

const buildWorkCompletedData = ({ booking, servant, timeEntry, completedAt }) => {
  const helperName = servant?.user?.name || "Your helper";
  const toIso = (value) => (value ? new Date(value).toISOString() : null);

  return {
    bookingId: booking.id,
    helperName,
    completedAt: completedAt.toISOString(),
    timeEntryId: timeEntry.id,
    workDetails: {
      clockIn: toIso(timeEntry.clockIn),
      clockOut: toIso(timeEntry.clockOut),
      hoursWorked: timeEntry.hoursWorked ?? null,
      bookingType: booking.bookingType,
      requestedSkill: booking.requestedSkill ?? null,
      sessionDate: toIso(booking.sessionDate),
      sessionStartTime: booking.sessionStartTime ?? null,
      sessionEndTime: booking.sessionEndTime ?? null
    }
  };
};

/** Notify house owner once per successful helper checkout (clock-out). */
const notifyWorkCompletedOnce = async ({ userId, booking, servant, timeEntry, completedAt }) => {
  if (!userId || !timeEntry?.id) return null;
  if (await hasWorkCompletedNotification(timeEntry.id)) return null;

  return createNotification({
    userId,
    title: "Work Completed",
    body: "Your assigned helper has completed the scheduled work.",
    type: WORK_COMPLETED_TYPE,
    data: buildWorkCompletedData({ booking, servant, timeEntry, completedAt })
  });
};

module.exports = {
  createNotification,
  findUsersNotifiedForOpenBooking,
  notifyWorkCompletedOnce,
  hasWorkCompletedNotification,
  WORK_COMPLETED_TYPE
};
