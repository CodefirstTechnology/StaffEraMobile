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

module.exports = { createNotification, findUsersNotifiedForOpenBooking };
