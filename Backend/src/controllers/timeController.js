const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { createNotification } = require("../services/notificationService");

const getServant = async (userId) => {
  const servant = await prisma.servant.findUnique({ where: { userId } });
  if (!servant) throw new ApiError(404, "Servant profile not found");
  return servant;
};

exports.clockIn = async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) throw new ApiError(400, "bookingId is required");

  const servant = await getServant(req.user.id);

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId }
  });

  if (!booking || booking.servantId !== servant.id) {
    throw new ApiError(404, "Booking not found");
  }
  if (!["CONFIRMED", "ACTIVE"].includes(booking.status)) {
    throw new ApiError(400, "Booking must be confirmed or active to clock in");
  }

  const openEntry = await prisma.timeEntry.findFirst({
    where: { servantId: servant.id, clockOut: null }
  });
  if (openEntry) {
    throw new ApiError(400, "Already clocked in. Clock out first.");
  }

  const now = new Date();
  const entry = await prisma.$transaction(async (tx) => {
    const e = await tx.timeEntry.create({
      data: {
        bookingId,
        servantId: servant.id,
        clockIn: now,
        date: now
      }
    });

    if (booking.status === "CONFIRMED") {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "ACTIVE" }
      });
    }

    return e;
  });

  const owner = await prisma.houseOwner.findUnique({
    where: { id: booking.houseOwnerId },
    select: { userId: true }
  });
  if (owner?.userId) {
    await createNotification({
      userId: owner.userId,
      title: "Helper has arrived",
      body: "Your helper started work at your location",
      type: "BOOKING_ACTIVE",
      data: { bookingId }
    });
  }

  sendSuccess(res, { entry }, 201);
};

exports.clockOut = async (req, res) => {
  const servant = await getServant(req.user.id);

  const openEntry = await prisma.timeEntry.findFirst({
    where: { servantId: servant.id, clockOut: null },
    orderBy: { clockIn: "desc" }
  });

  if (!openEntry) throw new ApiError(400, "No active clock-in session");

  const now = new Date();
  const hoursWorked =
    (now.getTime() - new Date(openEntry.clockIn).getTime()) / (1000 * 60 * 60);

  const entry = await prisma.timeEntry.update({
    where: { id: openEntry.id },
    data: { clockOut: now, hoursWorked: Math.round(hoursWorked * 100) / 100 }
  });

  sendSuccess(res, { entry });
};

exports.getToday = async (req, res) => {
  const servant = await getServant(req.user.id);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const entries = await prisma.timeEntry.findMany({
    where: {
      servantId: servant.id,
      date: { gte: start, lte: end }
    },
    include: { booking: { select: { id: true, address: true, bookingType: true } } },
    orderBy: { clockIn: "desc" }
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);

  sendSuccess(res, { entries, totalHours });
};

exports.getHistory = async (req, res) => {
  const servant = await getServant(req.user.id);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { servantId: servant.id },
      include: { booking: true },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.timeEntry.count({ where: { servantId: servant.id } })
  ]);

  sendSuccess(res, { entries, pagination: { page, limit, total } });
};
