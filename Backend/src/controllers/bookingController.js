const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const {
  checkBookingConflict,
  filterServantsAvailableForBooking,
  hasServantScheduleConflict,
  toConflictData,
  parseJsonArray,
  expireStaleSessionBookings,
  isSessionPast,
  computeBookingEarnings,
  normalizeBookingRow
} = require("../services/bookingService");
const { createNotification, findUsersNotifiedForOpenBooking } = require("../services/notificationService");
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
const { buildHomeSummary, getAvailableHelpersForOpenBooking } = require("../services/homeService");

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

    const availableServants = await filterServantsAvailableForBooking(
      nearbyServants,
      bookingData,
      booking.id
    );

    await Promise.all(
      availableServants.map((servant) =>
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
          notifiedServants: availableServants.length,
          helperNames: availableServants.map((s) => s.user.name),
          skippedBusy: nearbyServants.length - availableServants.length
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
    if (!status) {
      where.status = { notIn: ["CANCELLED", "REJECTED", "EXPIRED"] };
    }
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

  const declinedRows = await prisma.openRequestDecline.findMany({
    where: { servantId: servant.id },
    select: { bookingId: true }
  });
  const declinedIds = new Set(declinedRows.map((row) => row.bookingId));

  const filtered = openBookings.filter(
    (booking) =>
      !declinedIds.has(booking.id) &&
      servantCoversLocation(servant, booking.latitude, booking.longitude) &&
      bookingMatchesServantSkill(booking, servant) &&
      ((booking.bookingType === "SESSION" && servant.offersSession) ||
        (booking.bookingType === "MONTHLY" && servant.offersMonthly))
  );

  const availability = await Promise.all(
    filtered.map(async (booking) => ({
      booking,
      busy: await hasServantScheduleConflict(
        servant.id,
        toConflictData(booking),
        booking.id
      )
    }))
  );
  const requests = availability.filter((row) => !row.busy).map((row) => row.booking);

  sendSuccess(res, { requests });
};

exports.listDeclinedOpenBookingIds = async (req, res) => {
  const servant = await prisma.servant.findUnique({ where: { userId: req.user.id } });
  if (!servant) throw new ApiError(403, "Servant profile required");

  const rows = await prisma.openRequestDecline.findMany({
    where: { servantId: servant.id },
    select: { bookingId: true }
  });

  sendSuccess(res, { bookingIds: rows.map((row) => row.bookingId) });
};

exports.getHomeSummary = async (req, res) => {
  const houseOwner = await prisma.houseOwner.findUnique({
    where: { userId: req.user.id }
  });
  if (!houseOwner) throw new ApiError(403, "House owner profile required");

  const latitude =
    req.query.latitude != null ? Number(req.query.latitude) : houseOwner.latitude;
  const longitude =
    req.query.longitude != null ? Number(req.query.longitude) : houseOwner.longitude;

  const summary = await buildHomeSummary({
    houseOwnerId: houseOwner.id,
    latitude,
    longitude
  });

  sendSuccess(res, summary);
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

    if (isOpenNearby) {
      const declined = await prisma.openRequestDecline.findUnique({
        where: {
          bookingId_servantId: { bookingId: booking.id, servantId: servant.id }
        }
      });
      if (declined) throw new ApiError(403, "Not your booking");
    }

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
  if (!servant.zones?.length) {
    throw new ApiError(400, "Add at least one service zone before accepting jobs");
  }

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

    const conflictData = toConflictData(booking);
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
    await checkBookingConflict(
      booking.servantId,
      toConflictData(booking),
      booking.id
    );

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

const canServantViewOpenRequest = (servant, booking) =>
  booking.servantId == null &&
  booking.status === "PENDING" &&
  booking.latitude != null &&
  booking.longitude != null &&
  servantCoversLocation(servant, booking.latitude, booking.longitude) &&
  bookingMatchesServantSkill(booking, servant) &&
  ((booking.bookingType === "SESSION" && servant.offersSession) ||
    (booking.bookingType === "MONTHLY" && servant.offersMonthly));

const recordOpenRequestDecline = async (servant, bookingId, reason) => {
  const existing = await prisma.openRequestDecline.findUnique({
    where: {
      bookingId_servantId: { bookingId, servantId: servant.id }
    }
  });
  if (existing) return existing;

  return prisma.openRequestDecline.create({
    data: { bookingId, servantId: servant.id, reason }
  });
};

exports.declineOpenRequest = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "PENDING") {
    throw new ApiError(400, "Booking is not pending");
  }
  if (booking.servantId != null) {
    throw new ApiError(400, "This booking is assigned to you — use reject instead");
  }

  const reason = String(req.body.reason ?? "").trim();
  if (!reason) {
    throw new ApiError(400, "Decline reason is required");
  }

  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id },
    include: { skills: true, zones: true }
  });
  if (!servant) throw new ApiError(403, "Servant profile required");

  if (!canServantViewOpenRequest(servant, booking)) {
    throw new ApiError(403, "Not your booking");
  }

  await recordOpenRequestDecline(servant, id, reason);

  let updatedBooking = booking;
  const availableHelpers = await getAvailableHelpersForOpenBooking(booking);
  if (availableHelpers.length === 0) {
    updatedBooking = await prisma.booking.update({
      where: { id },
      data: { status: "EXPIRED" },
      include: bookingInclude
    });
  }

  sendSuccess(res, { booking: normalizeBookingRow(updatedBooking), declined: true });
};

exports.rejectBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "PENDING") {
    throw new ApiError(400, "Booking is not pending");
  }

  const reason = String(req.body.reason ?? "").trim();
  if (!reason) {
    throw new ApiError(400, "Decline reason is required");
  }

  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id },
    include: { skills: true, zones: true }
  });
  if (!servant) throw new ApiError(403, "Servant profile required");

  if (booking.servantId == null) {
    throw new ApiError(400, "Use decline-open for open area requests");
  }

  if (booking.servant.userId !== req.user.id) {
    throw new ApiError(403, "Only the assigned servant can reject");
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "REJECTED", rejectReason: reason },
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
      body: reason,
      type: "BOOKING_REJECTED",
      data: { bookingId: id }
    });
  }

  sendSuccess(res, { booking: updated });
};

exports.updateBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.houseOwner.userId !== req.user.id) {
    throw new ApiError(403, "Only the house owner can edit this booking");
  }

  const readOnlyStatuses = ["COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"];
  if (readOnlyStatuses.includes(booking.status)) {
    throw new ApiError(400, "Completed or cancelled bookings cannot be edited");
  }

  const body = req.body || {};

  if (booking.status === "ACTIVE") {
    const extraKeys = Object.keys(body).filter((key) => key !== "notes");
    if (extraKeys.length > 0 || body.notes === undefined) {
      throw new ApiError(400, "Only notes can be updated while work is in progress");
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { notes: body.notes?.trim() || null },
      include: bookingInclude
    });

    return sendSuccess(res, {
      booking: normalizeBookingRow(updated),
      message: "Booking updated"
    });
  }

  const data = {};

  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.address !== undefined) data.address = body.address;
  if (body.flatNo !== undefined) data.flatNo = body.flatNo?.trim() || null;
  if (body.building !== undefined) data.building = body.building?.trim() || null;
  if (body.area !== undefined) data.area = body.area?.trim() || null;
  if (body.latitude !== undefined) data.latitude = body.latitude;
  if (body.longitude !== undefined) data.longitude = body.longitude;
  if (body.totalAmount !== undefined) data.totalAmount = body.totalAmount;

  if (booking.servantId == null && body.requestedSkill !== undefined) {
    data.requestedSkill = body.requestedSkill
      ? String(body.requestedSkill).toUpperCase()
      : null;
  }

  let scheduleChanged = false;

  if (booking.bookingType === "SESSION") {
    const hasSessionUpdate =
      body.sessionDate !== undefined ||
      body.sessionStartTime !== undefined ||
      body.sessionEndTime !== undefined ||
      body.sessionSlots !== undefined ||
      body.sessionHours !== undefined;

    if (hasSessionUpdate) {
      scheduleChanged = true;
      const sessionBody = {
        sessionStartTime: body.sessionStartTime ?? booking.sessionStartTime,
        sessionEndTime: body.sessionEndTime ?? booking.sessionEndTime,
        sessionHours: body.sessionHours ?? booking.sessionHours,
        sessionSlots: body.sessionSlots ?? parseJsonArray(booking.sessionSlots)
      };
      Object.assign(data, normalizeSessionBooking(sessionBody));
      data.sessionDate = body.sessionDate
        ? new Date(body.sessionDate)
        : booking.sessionDate;

      if (!data.sessionDate) {
        throw new ApiError(400, "Session bookings require a visit date");
      }
      if (!data.sessionStartTime || !data.sessionEndTime) {
        throw new ApiError(400, "Session bookings require at least one time slot");
      }
    }
  } else if (booking.bookingType === "MONTHLY") {
    if (body.monthlyStartDate !== undefined) {
      scheduleChanged = true;
      data.monthlyStartDate = new Date(body.monthlyStartDate);
    }
    if (body.monthlyEndDate !== undefined) {
      scheduleChanged = true;
      data.monthlyEndDate = new Date(body.monthlyEndDate);
    }
    if (body.hoursPerDay !== undefined) data.hoursPerDay = body.hoursPerDay;
    if (body.workingDays !== undefined) {
      data.workingDays = normalizeWorkingDays(body.workingDays);
    }

    const start = data.monthlyStartDate ?? booking.monthlyStartDate;
    const end = data.monthlyEndDate ?? booking.monthlyEndDate;
    if (!start || !end) {
      throw new ApiError(400, "Monthly bookings require start and end dates");
    }
  }

  const nextLat = data.latitude ?? booking.latitude;
  const nextLng = data.longitude ?? booking.longitude;
  const nextAddress = data.address ?? booking.address;

  if (booking.servantId == null) {
    if (nextLat == null || nextLng == null || Number.isNaN(Number(nextLat)) || Number.isNaN(Number(nextLng))) {
      throw new ApiError(400, "Live location is required for area requests");
    }
    if (!String(nextAddress || "").trim()) {
      throw new ApiError(400, "Address is required for area requests");
    }
  }

  if (booking.servantId && scheduleChanged) {
    const conflictData = toConflictData({ ...booking, ...data, bookingType: booking.bookingType });
    await checkBookingConflict(
      booking.servantId,
      conflictData,
      booking.id,
      booking.houseOwnerId
    );
  }

  const updated = await prisma.booking.update({
    where: { id },
    data,
    include: bookingInclude
  });

  sendSuccess(res, {
    booking: normalizeBookingRow(updated),
    message: "Booking updated"
  });
};

exports.cancelBooking = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

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

  const cancelPayload = {
    title: "Booking cancelled",
    body: "The customer cancelled this booking",
    type: "BOOKING_CANCELLED",
    data: { bookingId: id }
  };

  if (booking.servant?.user?.id) {
    await createNotification({
      userId: booking.servant.user.id,
      ...cancelPayload
    });
  } else if (booking.latitude != null && booking.longitude != null) {
    const declinedRows = await prisma.openRequestDecline.findMany({
      where: { bookingId: id },
      select: { servantId: true }
    });
    const declinedServantIds = new Set(declinedRows.map((row) => row.servantId));

    let notifyUserIds = await findUsersNotifiedForOpenBooking(id);

    if (notifyUserIds.length === 0) {
      const nearbyServants = await findServantsNearLocation(booking.latitude, booking.longitude, {
        skill: booking.requestedSkill
      });
      const eligible = nearbyServants.filter((servant) => !declinedServantIds.has(servant.id));
      const availableServants = await filterServantsAvailableForBooking(
        eligible,
        toConflictData(booking),
        id
      );
      notifyUserIds = availableServants.map((servant) => servant.user.id);
    } else if (declinedServantIds.size > 0) {
      const declinedServants = await prisma.servant.findMany({
        where: { id: { in: [...declinedServantIds] } },
        select: { userId: true }
      });
      const declinedUserIds = new Set(declinedServants.map((row) => row.userId));
      notifyUserIds = notifyUserIds.filter((userId) => !declinedUserIds.has(userId));
    }

    await Promise.all(
      notifyUserIds.map((userId) =>
        createNotification({
          userId,
          ...cancelPayload
        })
      )
    );
  }

  sendSuccess(res, { booking: normalizeBookingRow(updated) });
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

const addMinutesToTime = (timeStr, mins) => {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMins = h * 60 + m + mins;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
};

const checkServantNextHourBooking = async (servantId, sessionDate, sessionEndTime, bookingId) => {
  const startTime = sessionEndTime;
  const endTime = addMinutesToTime(sessionEndTime, 60);

  const dayStart = new Date(sessionDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(sessionDate);
  dayEnd.setHours(23, 59, 59, 999);

  const BLOCKING_STATUSES = ["PENDING", "CONFIRMED", "ACTIVE"];

  const bookings = await prisma.booking.findMany({
    where: {
      servantId,
      status: { in: BLOCKING_STATUSES },
      id: { not: bookingId },
      sessionDate: { gte: dayStart, lte: dayEnd }
    }
  });

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const rangesOverlap = (startA, endA, startB, endB) =>
    timeToMinutes(startA) < timeToMinutes(endB) &&
    timeToMinutes(endA) > timeToMinutes(startB);

  const getBookingSlots = (booking) => {
    const parsed = Array.isArray(booking.sessionSlots)
      ? booking.sessionSlots
      : (() => {
          try {
            return JSON.parse(booking.sessionSlots || "[]");
          } catch {
            return [];
          }
        })();
    if (parsed.length && parsed[0]?.start && parsed[0]?.end) {
      return parsed;
    }
    if (booking.sessionStartTime && booking.sessionEndTime) {
      return [{ start: booking.sessionStartTime, end: booking.sessionEndTime }];
    }
    return [];
  };

  for (const b of bookings) {
    const slots = getBookingSlots(b);
    if (slots.some(slot => rangesOverlap(slot.start, slot.end, startTime, endTime))) {
      return b;
    }
  }

  const monthlies = await prisma.booking.findMany({
    where: {
      servantId,
      bookingType: "MONTHLY",
      status: { in: BLOCKING_STATUSES }
    }
  });

  const dayOfWeek = new Date(sessionDate)
    .toLocaleString("en-US", { weekday: "long" })
    .toUpperCase();

  for (const b of monthlies) {
    const start = new Date(b.monthlyStartDate);
    const end = new Date(b.monthlyEndDate);
    if (dayStart >= start && dayStart <= end) {
      const days = (() => {
        try {
          return Array.isArray(b.workingDays) ? b.workingDays : JSON.parse(b.workingDays || "[]");
        } catch {
          return String(b.workingDays || "").split(",").map(s => s.trim().toUpperCase());
        }
      })();
      if (days.map(d => d.toUpperCase()).includes(dayOfWeek)) {
        return b;
      }
    }
  }

  return null;
};

exports.requestExtension = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const booking = await loadBooking(id);

  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.bookingType !== "SESSION") {
    throw new ApiError(400, "Only session bookings can be extended");
  }
  if (!["CONFIRMED", "ACTIVE"].includes(booking.status)) {
    throw new ApiError(400, "Booking is not active or confirmed");
  }

  const conflict = await checkServantNextHourBooking(
    booking.servantId,
    booking.sessionDate,
    booking.sessionEndTime,
    booking.id
  );

  if (conflict) {
    throw new ApiError(400, "Helper is not available for extension (booked for next hour)");
  }

  const extensionRequestedEndTime = addMinutesToTime(booking.sessionEndTime, 15);

  const updated = await prisma.booking.update({
    where: { id },
    data: {
      extensionStatus: "PENDING",
      extensionRequestedEndTime
    },
    include: bookingInclude
  });

  if (booking.servant?.user?.id) {
    await createNotification({
      userId: booking.servant.user.id,
      title: "Session extension requested",
      body: `Your session is about to end. Do you want to extend the duration from ${booking.sessionEndTime} to ${extensionRequestedEndTime}?`,
      type: "EXTENSION_REQUESTED",
      data: { bookingId: id }
    });
  }

  sendSuccess(res, { booking: updated, message: "Extension requested successfully" });
};

exports.respondExtension = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { accept } = req.body;

  const booking = await loadBooking(id);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.extensionStatus !== "PENDING") {
    throw new ApiError(400, "No pending extension request found");
  }

  const servant = await getServantForUser(req.user.id);
  if (booking.servantId !== servant.id) {
    throw new ApiError(403, "Access denied");
  }

  if (accept) {
    const conflict = await checkServantNextHourBooking(
      booking.servantId,
      booking.sessionDate,
      booking.sessionEndTime,
      booking.id
    );

    if (conflict) {
      throw new ApiError(400, "Helper is not available for extension anymore (booked for next hour)");
    }

    const newHours = (booking.sessionHours || 0) + 0.25;
    const hourlyRate = booking.servant?.hourlyRate || 0;
    const newAmount = hourlyRate ? Math.round(newHours * hourlyRate * 100) / 100 : booking.totalAmount;

    let slots = [];
    try {
      slots = JSON.parse(booking.sessionSlots || "[]");
    } catch (err) {
      // ignore
    }
    if (slots.length > 0) {
      slots[slots.length - 1].end = booking.extensionRequestedEndTime;
    }
    const newSessionSlots = JSON.stringify(slots);

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        sessionEndTime: booking.extensionRequestedEndTime,
        sessionHours: newHours,
        sessionSlots: newSessionSlots,
        totalAmount: newAmount,
        extensionStatus: "ACCEPTED"
      },
      include: bookingInclude
    });

    if (booking.houseOwner?.user?.id) {
      await createNotification({
        userId: booking.houseOwner.user.id,
        title: "Extension accepted",
        body: `${servant.user.name || "Your helper"} accepted the session extension. New end time: ${booking.extensionRequestedEndTime}`,
        type: "EXTENSION_ACCEPTED",
        data: { bookingId: id }
      });
    }

    sendSuccess(res, { booking: updated, message: "Extension accepted successfully" });
  } else {
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        extensionStatus: "REJECTED"
      },
      include: bookingInclude
    });

    if (booking.houseOwner?.user?.id) {
      await createNotification({
        userId: booking.houseOwner.user.id,
        title: "Extension declined",
        body: `${servant.user.name || "Your helper"} declined the session extension.`,
        type: "EXTENSION_DECLINED",
        data: { bookingId: id }
      });
    }

    sendSuccess(res, { booking: updated, message: "Extension declined successfully" });
  }
};
