const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { parseJsonArray } = require("../services/bookingService");
const {
  findServantsNearLocation,
  servantCoversLocation,
  bookingMatchesServantSkill,
  DEFAULT_RADIUS_KM
} = require("../services/locationService");

const servantInclude = {
  user: { select: { id: true, name: true, email: true, phone: true } },
  skills: true,
  zones: true,
  agent: { include: { user: { select: { name: true } } } }
};

const resolveHouseOwnerCoords = async (userId, queryLat, queryLng) => {
  let lat = queryLat != null ? Number(queryLat) : null;
  let lng = queryLng != null ? Number(queryLng) : null;

  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    const ho = await prisma.houseOwner.findUnique({ where: { userId } });
    if (ho?.latitude != null && ho?.longitude != null) {
      lat = ho.latitude;
      lng = ho.longitude;
    }
  }

  return { lat, lng };
};

exports.listServants = async (req, res) => {
  const { skill, city, zone, latitude, longitude, radiusKm } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const skip = (page - 1) * limit;
  const { lat, lng } = await resolveHouseOwnerCoords(req.user.id, latitude, longitude);
  const radius = radiusKm != null ? Number(radiusKm) : DEFAULT_RADIUS_KM;

  const where = {
    verificationStatus: "VERIFIED",
    user: { isActive: true },
    ...(skill
      ? { skills: { some: { skillName: { equals: skill, mode: "insensitive" } } } }
      : {}),
    ...(city
      ? {
          OR: [
            { agent: { city: { contains: city, mode: "insensitive" } } },
            { zones: { some: { city: { contains: city, mode: "insensitive" } } } }
          ]
        }
      : {}),
    ...(zone
      ? {
          zones: {
            some: {
              OR: [
                { name: { contains: zone, mode: "insensitive" } },
                { city: { contains: zone, mode: "insensitive" } }
              ]
            }
          }
        }
      : {})
  };

  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    return sendSuccess(res, {
      servants: [],
      pagination: { page, limit, total: 0 },
      locationRequired: true
    });
  }

  let servants = await prisma.servant.findMany({
    where,
    include: servantInclude,
    orderBy: { rating: "desc" }
  });

  servants = servants.filter((s) => servantCoversLocation(s, lat, lng, radius));

  const total = servants.length;
  const paged = servants.slice(skip, skip + limit);

  sendSuccess(res, { servants: paged, pagination: { page, limit, total } });
};

exports.getServant = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const servant = await prisma.servant.findUnique({
    where: { id },
    include: {
      ...servantInclude,
      bookings: {
        where: { status: "COMPLETED", review: { isNot: null } },
        include: { review: true, houseOwner: { include: { user: { select: { name: true } } } } },
        take: 5,
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!servant) throw new ApiError(404, "Servant not found");
  if (req.user.role === "HOUSE_OWNER") {
    if (servant.verificationStatus !== "VERIFIED") {
      throw new ApiError(404, "Servant not found");
    }

    const { lat, lng } = await resolveHouseOwnerCoords(
      req.user.id,
      req.query.latitude,
      req.query.longitude
    );
    if (lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (!servantCoversLocation(servant, lat, lng)) {
        throw new ApiError(404, "Servant not found");
      }
    }
  }

  sendSuccess(res, { servant });
};

exports.getMyProfile = async (req, res) => {
  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id },
    include: servantInclude
  });
  if (!servant) throw new ApiError(404, "Servant profile not found");
  sendSuccess(res, { servant });
};

exports.updateMyProfile = async (req, res) => {
  const { bio, profilePhoto, availableFrom, availableTo, workingDays } = req.body;

  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id }
  });
  if (!servant) throw new ApiError(404, "Servant profile not found");

  const updated = await prisma.servant.update({
    where: { id: servant.id },
    data: {
      ...(bio !== undefined && { bio }),
      ...(profilePhoto !== undefined && { profilePhoto }),
      ...(availableFrom !== undefined && { availableFrom }),
      ...(availableTo !== undefined && { availableTo }),
      ...(workingDays !== undefined && {
        workingDays: Array.isArray(workingDays)
          ? JSON.stringify(workingDays)
          : workingDays
      })
    },
    include: servantInclude
  });

  sendSuccess(res, { servant: updated });
};

exports.getMySchedule = async (req, res) => {
  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id }
  });
  if (!servant) throw new ApiError(404, "Servant profile not found");

  const bookings = await prisma.booking.findMany({
    where: {
      servantId: servant.id,
      status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] }
    },
    include: {
      houseOwner: { include: { user: { select: { name: true, phone: true } } } }
    },
    orderBy: { createdAt: "asc" }
  });

  const grouped = {};
  for (const b of bookings) {
    const key =
      b.bookingType === "SESSION" && b.sessionDate
        ? new Date(b.sessionDate).toISOString().split("T")[0]
        : b.monthlyStartDate
          ? new Date(b.monthlyStartDate).toISOString().split("T")[0]
          : "unscheduled";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(b);
  }

  sendSuccess(res, { schedule: grouped, bookings });
};

exports.getMyTimeEntries = async (req, res) => {
  const servant = await prisma.servant.findUnique({
    where: { userId: req.user.id }
  });
  if (!servant) throw new ApiError(404, "Servant profile not found");

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { servantId: servant.id },
      include: { booking: { select: { id: true, bookingType: true, address: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.timeEntry.count({ where: { servantId: servant.id } })
  ]);

  sendSuccess(res, { entries, pagination: { page, limit, total } });
};
