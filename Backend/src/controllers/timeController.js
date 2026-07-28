const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const {
  createNotification,
  notifyWorkCompletedOnce
} = require("../services/notificationService");
const { hasPendingWorkOtp } = require("../services/workStartOtpService");
const { computeBookingEarnings, isSessionPast, expireStaleSessionBookings } = require("../services/bookingService");

const getMonthBounds = (ref = new Date()) => {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

const getBookingEarningsDate = (booking) =>
  booking.sessionDate || booking.monthlyStartDate || booking.updatedAt;

const isInMonth = (value, start, end) => {
  if (!value) return false;
  const d = new Date(value);
  return d >= start && d <= end;
};

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

  if (booking.status === "CONFIRMED") {
    const pending = await hasPendingWorkOtp(bookingId);
    if (pending) {
      throw new ApiError(400, "Enter the 4-digit OTP from the home owner to start work");
    }
    throw new ApiError(400, "Tap I arrived to get an OTP from the home owner first");
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

  const booking = await prisma.booking.findUnique({
    where: { id: openEntry.bookingId },
    include: {
      timeEntries: true,
      servant: {
        include: {
          user: { select: { name: true } }
        }
      },
      houseOwner: {
        include: {
          user: { select: { id: true } }
        }
      }
    }
  });

  if (!booking) throw new ApiError(404, "Booking not found");

  const wasAlreadyCompleted = booking.status === "COMPLETED";
  const now = new Date();
  const hoursWorked =
    (now.getTime() - new Date(openEntry.clockIn).getTime()) / (1000 * 60 * 60);

  const entry = await prisma.timeEntry.update({
    where: { id: openEntry.id },
    data: { clockOut: now, hoursWorked: Math.round(hoursWorked * 100) / 100 }
  });

  if (["CONFIRMED", "ACTIVE"].includes(booking.status)) {
    const totalAmount = computeBookingEarnings(
      { ...booking, timeEntries: booking.timeEntries },
      booking.servant?.hourlyRate
    );

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        ...(totalAmount > 0 ? { totalAmount } : {}),
        status: "COMPLETED"
      }
    });
  }

  if (!wasAlreadyCompleted && booking.houseOwner?.user?.id) {
    await notifyWorkCompletedOnce({
      userId: booking.houseOwner.user.id,
      booking,
      servant: booking.servant,
      timeEntry: entry,
      completedAt: now
    });
  }

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
    include: {
      booking: {
        select: {
          id: true,
          address: true,
          flatNo: true,
          building: true,
          area: true,
          bookingType: true,
          requestedSkill: true,
          houseOwner: {
            select: {
              user: {
                select: {
                  name: true,
                  phone: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { clockIn: "desc" }
  });

  const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked || 0), 0);

  const servantProfile = await prisma.servant.findUnique({
    where: { id: servant.id },
    select: { hourlyRate: true }
  });
  const hourlyRate = servantProfile?.hourlyRate || 0;
  const estimatedEarnings = Math.round(totalHours * hourlyRate * 100) / 100;

  sendSuccess(res, { entries, totalHours, hourlyRate, estimatedEarnings });
};

exports.getMonth = async (req, res) => {
  const servant = await getServant(req.user.id);
  const now = new Date();
  const { start, end } = getMonthBounds(now);

  await expireStaleSessionBookings({ servantId: servant.id });

  const completed = await prisma.booking.findMany({
    where: {
      servantId: servant.id,
      status: "COMPLETED"
    },
    include: { timeEntries: true }
  });

  const hourlyRate = servant.hourlyRate || 0;
  const inMonth = completed.filter((booking) => {
    const earningsDate = getBookingEarningsDate(booking);
    return isInMonth(earningsDate, start, end) || isInMonth(booking.updatedAt, start, end);
  });

  const totalEarnings = inMonth.reduce(
    (sum, booking) => sum + computeBookingEarnings(booking, hourlyRate),
    0
  );

  sendSuccess(res, {
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    completedCount: inMonth.length,
    hourlyRate,
    monthLabel: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  });
};

exports.getHistory = async (req, res) => {
  const servant = await getServant(req.user.id);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { servantId: servant.id },
      include: {
        booking: {
          include: {
            houseOwner: {
              select: {
                user: {
                  select: {
                    name: true,
                    phone: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.timeEntry.count({ where: { servantId: servant.id } })
  ]);

  sendSuccess(res, { entries, pagination: { page, limit, total } });
};
