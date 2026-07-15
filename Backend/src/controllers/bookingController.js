const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const {
  checkBookingConflict,
  parseJsonArray,
  expireStaleSessionBookings,
  isSessionPast,
  computeBookingEarnings,
  normalizeBookingRow
} = require("../services/bookingService");
const { createNotification } = require("../services/notificationService");
const {
  issueWorkStartOtp,
  verifyWorkStartOtp,
  attachWorkOtpFields,
  hasPendingWorkOtp
} = require("../services/workStartOtpService");
const {
  findServantsNearLocation,
  servantCoversLocation,
  bookingMatchesServantSkill
} = require("../services/locationService");

const bookingInclude = {
  servant: {
    include: {
      user: { select: { id: true, name: true, phone: true } },
      skills: true
    }
  },
  houseOwner: {
    include: { user: { select: { id: true, name: true, phone: true } } }
  },
  review: true,
  timeEntries: true
};

const loadBooking = (id) =>
  prisma.booking.findUnique({
    where: { id },
    include: {
      ...bookingInclude,
      servant: { include: { user: { select: { id: true } }, skills: true } },
      houseOwner: { include: { user: { select: { id: true, name: true, phone: true } } } }
    }
  });

const normalizeWorkingDays = (workingDays) =>
  Array.isArray(workingDays) ? JSON.stringify(workingDays) : workingDays;

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
};

const normalizeSessionBooking = (body) => {
  const slots = Array.isArray(body.sessionSlots)
    ? body.sessionSlots.filter((slot) => slot?.start && slot?.end)
    : [];

  if (slots.length > 0) {
    const sorted = [...slots].sort(
      (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
    );
    return {
      sessionSlots: JSON.stringify(sorted),
      sessionStartTime: sorted[0].start,
      sessionEndTime: sorted[sorted.length - 1].end,
      sessionHours: sorted.length
    };
  }

  if (body.sessionStartTime && body.sessionEndTime) {
    const single = [{ start: body.sessionStartTime, end: body.sessionEndTime }];
    return {
      sessionSlots: JSON.stringify(single),
      sessionStartTime: body.sessionStartTime,
      sessionEndTime: body.sessionEndTime,
      sessionHours: body.sessionHours ?? 1
    };
  }

  return {
    sessionSlots: undefined,
    sessionStartTime: body.sessionStartTime,
    sessionEndTime: body.sessionEndTime,
    sessionHours: body.sessionHours
  };
};

exports.createBooking = async (req, res) => {
  const houseOwner = await prisma.houseOwner.findUnique({
    where: { userId: req.user.id }
  });
  if (!houseOwner) throw new ApiError(403, "House owner profile required");

  const sessionFields = normalizeSessionBooking(req.body);
  const bookingData = {
    ...req.body,
    ...sessionFields,
    workingDays: normalizeWorkingDays(req.body.workingDays),
    monthlyStartDate: req.body.monthlyStartDate
      ? new Date(req.body.monthlyStartDate)
      : undefined,
    monthlyEndDate: req.body.monthlyEndDate
      ? new Date(req.body.monthlyEndDate)
      : undefined,
    sessionDate: req.body.sessionDate ? new Date(req.body.sessionDate) : undefined,
    requestedSkill: req.body.requestedSkill
      ? String(req.body.requestedSkill).toUpperCase()
      : undefined
  };

  const latitude = bookingData.latitude ?? houseOwner.latitude ?? undefined;
  const longitude = bookingData.longitude ?? houseOwner.longitude ?? undefined;
  const address = bookingData.address || houseOwner.address;
  const flatNo = bookingData.flatNo ?? houseOwner.flatNo ?? undefined;
  const building = bookingData.building ?? houseOwner.building ?? undefined;
  const area = bookingData.area ?? houseOwner.area ?? undefined;

  if (!req.body.servantId) {
    if (
      latitude == null ||
      longitude == null ||
      Number.isNaN(Number(latitude)) ||
      Number.isNaN(Number(longitude))
    ) {
      throw new ApiError(
        400,
        "Live location (latitude and longitude) is required for area requests"
      );
    }

    const booking = await prisma.booking.create({
      data: {
        houseOwnerId: houseOwner.id,
        servantId: null,
        bookingType: bookingData.bookingType,
        requestedSkill: bookingData.requestedSkill,
        monthlyStartDate: bookingData.monthlyStartDate,
        monthlyEndDate: bookingData.monthlyEndDate,
        hoursPerDay: bookingData.hoursPerDay,
        workingDays: bookingData.workingDays,
        sessionDate: bookingData.sessionDate,
        sessionStartTime: bookingData.sessionStartTime,
        sessionEndTime: bookingData.sessionEndTime,
        sessionHours: bookingData.sessionHours,
        sessionSlots: bookingData.sessionSlots,
        address,
        flatNo,
        building,
        area,
        latitude,
        longitude,
        totalAmount: bookingData.totalAmount,
        notes: bookingData.notes,
        status: "PENDING"
      },
      include: bookingInclude
    });

    const nearbyServants = await findServantsNearLocation(latitude, longitude, {
      skill: bookingData.requestedSkill
    });

    await Promise.all(
      nearbyServants.map((servant) =>
        createNotification({
          userId: servant.user.id,
          title: "Job request in your area",
          body: "A customer nearby needs help — accept first to get the job",
          type: "BOOKING_OPEN",
          data: { bookingId: booking.id }
        })
      )
    );

    return sendSuccess(
      res,
      {
        booking,
        broadcast: {
          notifiedServants: nearbyServants.length,
          helperNames: nearbyServants.map((s) => s.user.name)
        }
      },
      201
    );
  }

  const servant = await prisma.servant.findUnique({
    where: { id: req.body.servantId },
    include: { zones: true }
  });
  if (!servant || servant.verificationStatus !== "VERIFIED") {
    throw new ApiError(400, "Servant not available for booking");
  }

  if (
    latitude != null &&
    longitude != null &&
    !servantCoversLocation(servant, latitude, longitude)
  ) {
    throw new ApiError(400, "This helper does not serve your area");
  }

  const booking = await prisma.$transaction(async (tx) => {
    await checkBookingConflict(servant.id, bookingData, undefined, houseOwner.id);

    return tx.booking.create({
      data: {
        houseOwnerId: houseOwner.id,
        servantId: servant.id,
        bookingType: bookingData.bookingType,
        requestedSkill: bookingData.requestedSkill,
        monthlyStartDate: bookingData.monthlyStartDate,
        monthlyEndDate: bookingData.monthlyEndDate,
        hoursPerDay: bookingData.hoursPerDay,
        workingDays: bookingData.workingDays,
        sessionDate: bookingData.sessionDate,
        sessionStartTime: bookingData.sessionStartTime,
        sessionEndTime: bookingData.sessionEndTime,
        sessionHours: bookingData.sessionHours,
        sessionSlots: bookingData.sessionSlots,
        address,
        flatNo,
        building,
        area,
        latitude,
        longitude,
        totalAmount: bookingData.totalAmount,
        notes: bookingData.notes,
        status: "PENDING"
      },
      include: bookingInclude
    });
  });

  const servantUser = await prisma.user.findUnique({
    where: { id: servant.userId }
  });

  if (servantUser) {
    await createNotification({
      userId: servantUser.id,
      title: "New booking request",
      body: "You have a new booking request",
      type: "BOOKING_CREATED",
      data: { bookingId: booking.id }
    });
  }

  sendSuccess(res, { booking }, 201);
};

exports.listBookings = async (req, res) => {
  const { status } = req.query;
  let where = {};

  if (req.user.role === "HOUSE_OWNER") {
    const ho = await prisma.houseOwner.findUnique({ where: { userId: req.user.id } });
    if (!ho) throw new ApiError(403, "House owner profile required");
    where.houseOwnerId = ho.id;
  } else if (req.user.role === "SERVANT") {
    const s = await prisma.servant.findUnique({ where: { userId: req.user.id } });
    if (!s) throw new ApiError(403, "Servant profile required");
    where.servantId = s.id;
  } else {
    throw new ApiError(403, "Not allowed");
  }

  await expireStaleSessionBookings(where);

  if (status) where.status = status;

  const bookings = await prisma.booking.findMany({
    where,
    include: bookingInclude,
    orderBy: { createdAt: "desc" }
  });

  const enriched = await attachWorkOtpFields(bookings, req.user.role);
  sendSuccess(res, { bookings: enriched.map(normalizeBookingRow) });
};

exports.listOpenRequests = async (req, res) => {
  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id },
    include: { skills: true, zones: true, user: { select: { name: true } } }
  });
  if (!servant) throw new ApiError(403, "Servant profile required");

  const openBookings = await prisma.booking.findMany({
    where: {
      servantId: null,
      status: "PENDING",
      latitude: { not: null },
      longitude: { not: null }
    },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
    take: 50
  });

  const requests = openBookings.filter(
    (booking) =>
      servantCoversLocation(servant, booking.latitude, booking.longitude) &&
      bookingMatchesServantSkill(booking, servant) &&
      ((booking.bookingType === "SESSION" && servant.offersSession) ||
       (booking.bookingType === "MONTHLY" && servant.offersMonthly))
  );

  sendSuccess(res, { requests });
};

exports.getBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  await assertBookingAccess(req, booking);

  const [enriched] = await attachWorkOtpFields([booking], req.user.role);
  sendSuccess(res, { booking: normalizeBookingRow(enriched) });
};

const assertBookingAccess = async (req, booking) => {
  if (req.user.role === "HOUSE_OWNER") {
    if (booking.houseOwner.userId !== req.user.id) {
      throw new ApiError(403, "Not your booking");
    }
  } else if (req.user.role === "SERVANT") {
    const servant = await prisma.servant.findUnique({
      where: { userId: req.user.id },
      include: { skills: true, zones: true }
    });
    if (!servant) throw new ApiError(403, "Servant profile required");

    const isAssigned = booking.servantId === servant.id;
    const isOpenNearby =
      booking.servantId == null &&
      booking.status === "PENDING" &&
      booking.latitude != null &&
      booking.longitude != null &&
      servantCoversLocation(servant, booking.latitude, booking.longitude) &&
      bookingMatchesServantSkill(booking, servant);

    if (!isAssigned && !isOpenNearby) {
      throw new ApiError(403, "Not your booking");
    }
  } else if (!["ADMIN", "AGENT"].includes(req.user.role)) {
    throw new ApiError(403, "Access denied");
  }
};

exports.confirmBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "PENDING") {
    throw new ApiError(400, "Booking is not pending");
  }

  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id },
    include: { skills: true, zones: true, user: { select: { name: true } } }
  });
  if (!servant) throw new ApiError(403, "Servant profile required");

  if (booking.servantId == null) {
    if (
      booking.latitude == null ||
      booking.longitude == null ||
      !servantCoversLocation(servant, booking.latitude, booking.longitude)
    ) {
      throw new ApiError(403, "This request is outside your service area");
    }
    if (!bookingMatchesServantSkill(booking, servant)) {
      throw new ApiError(403, "This request does not match your skills");
    }

    const conflictData = {
      bookingType: booking.bookingType,
      sessionDate: booking.sessionDate,
      sessionStartTime: booking.sessionStartTime,
      sessionEndTime: booking.sessionEndTime,
      monthlyStartDate: booking.monthlyStartDate,
      monthlyEndDate: booking.monthlyEndDate,
      workingDays: booking.workingDays,
      hoursPerDay: booking.hoursPerDay
    };
    await checkBookingConflict(servant.id, conflictData, booking.id);

    const claimed = await prisma.booking.updateMany({
      where: { id, servantId: null, status: "PENDING" },
      data: { servantId: servant.id, status: "CONFIRMED" }
    });

    if (claimed.count === 0) {
      throw new ApiError(
        409,
        "Another helper already accepted this request. Check open requests for more jobs."
      );
    }

    const updated = await prisma.booking.findUnique({
      where: { id },
      include: bookingInclude
    });

    const ownerUserId = (
      await prisma.houseOwner.findUnique({
        where: { id: booking.houseOwnerId },
        select: { userId: true }
      })
    )?.userId;

    if (ownerUserId) {
      await createNotification({
        userId: ownerUserId,
        title: "Helper assigned",
        body: `${servant.user?.name || "A helper"} accepted your request`,
        type: "BOOKING_CONFIRMED",
        data: { bookingId: id }
      });
    }

    return sendSuccess(res, { booking: updated });
  }

  if (booking.servant.userId !== req.user.id) {
    throw new ApiError(403, "Only the assigned servant can confirm");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const conflictData = {
      bookingType: booking.bookingType,
      sessionDate: booking.sessionDate,
      sessionStartTime: booking.sessionStartTime,
      sessionEndTime: booking.sessionEndTime,
      monthlyStartDate: booking.monthlyStartDate,
      monthlyEndDate: booking.monthlyEndDate,
      workingDays: booking.workingDays,
      hoursPerDay: booking.hoursPerDay
    };
    await checkBookingConflict(booking.servantId, conflictData, booking.id);

    return tx.booking.update({
      where: { id },
      data: { status: "CONFIRMED" },
      include: bookingInclude
    });
  });

  const ownerUserId = (
    await prisma.houseOwner.findUnique({
      where: { id: booking.houseOwnerId },
      select: { userId: true }
    })
  ).userId;

  await createNotification({
    userId: ownerUserId,
    title: "Booking confirmed",
    body: "Your booking has been confirmed",
    type: "BOOKING_CONFIRMED",
    data: { bookingId: id }
  });

  sendSuccess(res, { booking: updated });
};

exports.rejectBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "PENDING") {
    throw new ApiError(400, "Booking is not pending");
  }
  if (booking.servantId == null) {
    throw new ApiError(400, "Open area requests cannot be declined — ignore if unavailable");
  }
  if (booking.servant.userId !== req.user.id) {
    throw new ApiError(403, "Only the assigned servant can reject");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "REJECTED", notes: req.body.reason || booking.notes },
    include: bookingInclude
  });

  const ownerUserId = (
    await prisma.houseOwner.findUnique({
      where: { id: booking.houseOwnerId },
      select: { userId: true }
    })
  )?.userId;

  if (ownerUserId) {
    await createNotification({
      userId: ownerUserId,
      title: "Booking declined",
      body: req.body.reason || "The helper is unavailable for this booking",
      type: "BOOKING_REJECTED",
      data: { bookingId: id }
    });
  }

  sendSuccess(res, { booking: updated });
};

exports.cancelBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { houseOwner: true }
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.houseOwner.userId !== req.user.id) {
    throw new ApiError(403, "Only the house owner can cancel");
  }
  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new ApiError(400, "Cannot cancel booking in current status");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELLED" },
    include: bookingInclude
  });

  sendSuccess(res, { booking: updated });
};

exports.completeBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");

  const isOwner = booking.houseOwner.userId === req.user.id;
  const isServant = booking.servant.userId === req.user.id;
  if (!isOwner && !isServant) throw new ApiError(403, "Access denied");

  if (!["CONFIRMED", "ACTIVE"].includes(booking.status)) {
    throw new ApiError(400, "Booking cannot be completed");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "COMPLETED" },
    include: bookingInclude
  });

  await createNotification({
    userId: booking.houseOwner.userId,
    title: "Booking completed",
    body: "Your booking has been marked completed",
    type: "BOOKING_COMPLETED",
    data: { bookingId: id }
  });

  sendSuccess(res, { booking: updated });
};

exports.createReview = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rating, comment } = req.body;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { houseOwner: true, servant: true, review: true }
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.houseOwner.userId !== req.user.id) {
    throw new ApiError(403, "Only house owner can review");
  }
  if (booking.status !== "COMPLETED") {
    throw new ApiError(400, "Can only review completed bookings");
  }
  if (booking.review) throw new ApiError(400, "Review already exists");

  const review = await prisma.$transaction(async (tx) => {
    const r = await tx.review.create({
      data: { bookingId: id, rating, comment }
    });

    const servant = booking.servant;
    const newTotal = servant.totalRatings + 1;
    const newRating =
      (servant.rating * servant.totalRatings + rating) / newTotal;

    await tx.servant.update({
      where: { id: servant.id },
      data: { rating: newRating, totalRatings: newTotal }
    });

    return r;
  });

  sendSuccess(res, { review }, 201);
};

const trackingPayload = (booking) => ({
  status: booking.status,
  home: {
    address: booking.address,
    latitude: booking.latitude,
    longitude: booking.longitude
  },
  servant:
    booking.servantLatitude != null && booking.servantLongitude != null
      ? {
          latitude: booking.servantLatitude,
          longitude: booking.servantLongitude,
          updatedAt: booking.servantLocationAt
        }
      : null
});

exports.getBookingTracking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      servant: { include: { user: { select: { id: true, name: true } } } },
      houseOwner: { include: { user: { select: { id: true } } } }
    }
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  await assertBookingAccess(req, booking);

  sendSuccess(res, trackingPayload(booking));
};

exports.updateBookingTracking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { latitude, longitude } = req.body;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      servant: { include: { user: { select: { id: true, name: true } } } },
      houseOwner: { include: { user: { select: { id: true } } } }
    }
  });

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.servant.userId !== req.user.id) {
    throw new ApiError(403, "Only the assigned servant can share location");
  }
  if (!["CONFIRMED", "ACTIVE"].includes(booking.status)) {
    throw new ApiError(400, "Location sharing is only available for confirmed or active bookings");
  }

  const firstShare = booking.servantLatitude == null || booking.servantLongitude == null;

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      servantLatitude: latitude,
      servantLongitude: longitude,
      servantLocationAt: new Date()
    }
  });

  if (firstShare && booking.houseOwner?.user?.id) {
    await createNotification({
      userId: booking.houseOwner.user.id,
      title: "Helper is on the way",
      body: `${booking.servant?.user?.name || "Your helper"} started sharing live location — open your booking to track on the map`,
      type: "HELPER_ON_WAY",
      data: { bookingId: id }
    });
  }

  sendSuccess(res, trackingPayload(updated));
};

const getServantForUser = async (userId) => {
  const servant = await prisma.servant.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true } } }
  });
  if (!servant) throw new ApiError(403, "Servant profile required");
  return servant;
};

exports.markArrived = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "CONFIRMED") {
    throw new ApiError(400, "Booking must be confirmed before starting work");
  }

  const servant = await getServantForUser(req.user.id);
  if (booking.servantId !== servant.id) {
    throw new ApiError(403, "Not your booking");
  }

  const openEntry = await prisma.timeEntry.findFirst({
    where: { servantId: servant.id, clockOut: null }
  });
  if (openEntry) {
    throw new ApiError(400, "Already working on a job. Finish it first.");
  }

  const { expiresAt } = await issueWorkStartOtp({
    booking,
    servantUser: servant.user,
    ownerUserId: booking.houseOwner.userId
  });

  const refreshed = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });
  const [enriched] = await attachWorkOtpFields([refreshed], "SERVANT");

  sendSuccess(res, {
    booking: enriched,
    message: "OTP sent to home owner. Ask them for the 4-digit code.",
    otpExpiresAt: expiresAt.toISOString()
  });
};

exports.resendWorkOtp = async (req, res) => {
  return exports.markArrived(req, res);
};

exports.verifyWorkOtp = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { otp } = req.body;

  const booking = await loadBooking(id);
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "CONFIRMED") {
    throw new ApiError(400, "Work OTP is only needed for confirmed bookings");
  }

  const servant = await getServantForUser(req.user.id);
  if (booking.servantId !== servant.id) {
    throw new ApiError(403, "Not your booking");
  }

  const openEntry = await prisma.timeEntry.findFirst({
    where: { servantId: servant.id, clockOut: null }
  });
  if (openEntry) {
    throw new ApiError(400, "Already clocked in");
  }

  const pending = await hasPendingWorkOtp(id);
  if (!pending) {
    throw new ApiError(400, "No active OTP. Tap I arrived to request a new code.");
  }

  await verifyWorkStartOtp({ bookingId: id, otpInput: otp });

  const now = new Date();
  const entry = await prisma.$transaction(async (tx) => {
    const e = await tx.timeEntry.create({
      data: {
        bookingId: id,
        servantId: servant.id,
        clockIn: now,
        date: now
      }
    });

    await tx.booking.update({
      where: { id },
      data: { status: "ACTIVE", workStartedAt: now }
    });

    return e;
  });

  if (booking.houseOwner?.userId) {
    await createNotification({
      userId: booking.houseOwner.userId,
      title: "Helper has arrived",
      body: `${servant.user?.name || "Your helper"} started work at your location`,
      type: "BOOKING_ACTIVE",
      data: { bookingId: id }
    });
  }

  const refreshed = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude
  });
  const [enriched] = await attachWorkOtpFields([refreshed], "SERVANT");

  sendSuccess(res, { booking: enriched, entry, message: "OTP verified. Work started." });
};
