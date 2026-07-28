const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { normalizeEmail, normalizePhone } = require("../utils/normalize");
const {
  ROLE_IDS,
  roleWhereByCode,
  serializeUser,
  userWithRoleInclude
} = require("../services/roleService");
const { attachAnnualRevenueToAgents } = require("../services/agentRevenueService");
const { DEFAULT_RADIUS_KM } = require("../services/locationService");

const generateAgentPassword = () => {
  const spec = "!@#$%^&*";
  const num = "0123456789";
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const r = (chars, len) => {
    let s = "";
    for (let i = 0; i < len; i++) {
      s += chars.charAt(crypto.randomBytes(1)[0] % chars.length);
    }
    return s;
  };
  return "Ag" + r(letters, 2) + r(uppers, 2) + r(num, 2) + r(spec, 2);
};

exports.getStats = async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOwners,
    totalAgents,
    totalServants,
    verifiedServants,
    pendingVerification,
    totalBookings,
    activeBookings,
    completedBookings,
    revenueAgg,
    monthBookings,
    monthRevenue
  ] = await Promise.all([
    prisma.houseOwner.count(),
    prisma.agent.count(),
    prisma.servant.count(),
    prisma.servant.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.servant.count({
      where: { verificationStatus: { in: ["PENDING", "UNDER_REVIEW"] } }
    }),
    prisma.booking.count(),
    prisma.booking.count({
      where: { status: { in: ["CONFIRMED", "ACTIVE"] } }
    }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.aggregate({
      where: { status: "COMPLETED" },
      _sum: { totalAmount: true }
    }),
    prisma.booking.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.booking.aggregate({
      where: { createdAt: { gte: monthStart }, status: "COMPLETED" },
      _sum: { totalAmount: true }
    })
  ]);

  const bookingsByMonth = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

    const [count, rev] = await Promise.all([
      prisma.booking.count({
        where: { createdAt: { gte: d, lte: end } }
      }),
      prisma.booking.aggregate({
        where: {
          createdAt: { gte: d, lte: end },
          status: "COMPLETED"
        },
        _sum: { totalAmount: true }
      })
    ]);

    bookingsByMonth.push({
      month: d.toLocaleString("en", { month: "short" }),
      count,
      revenue: rev._sum.totalAmount || 0
    });
  }

  sendSuccess(res, {
    totalOwners,
    totalAgents,
    totalServants,
    verifiedServants,
    pendingVerification,
    totalBookings,
    activeBookings,
    completedBookings,
    totalRevenue: revenueAgg._sum.totalAmount || 0,
    bookingsThisMonth: monthBookings,
    revenueThisMonth: monthRevenue._sum.totalAmount || 0,
    bookingsByMonth,
    maxServiceRadiusKm: Number(process.env.MAX_SERVICE_RADIUS_KM) || 50
  });
};

exports.listUsers = async (req, res) => {
  const { role, search, isActive } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, parseInt(req.query.limit, 10) || 100);

  const where = {
    ...roleWhereByCode(role),
    ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleId: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, code: true, label: true } },
        houseOwner: { select: { city: true, address: true } }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.user.count({ where })
  ]);

  sendSuccess(res, {
    users: users.map(serializeUser),
    pagination: { page, limit, total }
  });
};

exports.listBookings = async (req, res) => {
  const { status, type } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const where = {
    ...(status ? { status } : {}),
    ...(type ? { bookingType: type } : {})
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        houseOwner: { include: { user: { select: { name: true } } } },
        servant: { include: { user: { select: { name: true } } } }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.booking.count({ where })
  ]);

  sendSuccess(res, { bookings, pagination: { page, limit, total } });
};

exports.listServants = async (req, res) => {
  const { status } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const where = status ? { verificationStatus: status } : {};

  const [servants, total] = await Promise.all([
    prisma.servant.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        agent: { include: { user: { select: { name: true } } } },
        skills: true
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.servant.count({ where })
  ]);

  sendSuccess(res, { servants, pagination: { page, limit, total } });
};

exports.listAgents = async (req, res) => {
  const { search, city } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const where = {
    ...(city
      ? { city: { contains: city, mode: "insensitive" } }
      : {}),
    ...(search
      ? {
          OR: [
            { agencyName: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { address: { contains: search, mode: "insensitive" } },
            { user: { name: { contains: search, mode: "insensitive" } } },
            { user: { email: { contains: search, mode: "insensitive" } } }
          ]
        }
      : {})
  };

  const [agents, total] = await Promise.all([
    prisma.agent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
            roleId: true
          }
        },
        _count: { select: { servants: true } }
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" }
    }),
    prisma.agent.count({ where })
  ]);

  const agentsWithRevenue = await attachAnnualRevenueToAgents(agents);

  sendSuccess(res, { agents: agentsWithRevenue, pagination: { page, limit, total } });
};

exports.createAgent = async (req, res) => {
  const {
    name,
    agencyName,
    address,
    city,
    latitude,
    longitude,
    generatePassword,
    serviceRadiusKm
  } = req.body;
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);
  let password = req.body.password?.trim();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, ...(phone ? [{ phone }] : [])]
    }
  });
  if (existing) throw new ApiError(400, "Email or phone already registered");

  if (!password || generatePassword) {
    password = generateAgentPassword();
  } else if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email,
      phone,
      password: hashed,
      roleId: ROLE_IDS.AGENT,
      agent: {
        create: {
          agencyName: agencyName?.trim() || null,
          address: address.trim(),
          city: city?.trim() || null,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          serviceRadiusKm:
            serviceRadiusKm != null && serviceRadiusKm !== ""
              ? parseFloat(serviceRadiusKm)
              : DEFAULT_RADIUS_KM
        }
      }
    },
    include: { agent: true, ...userWithRoleInclude }
  });

  sendSuccess(
    res,
    {
      agent: user.agent,
      user: serializeUser(user),
      credentials: { email, password }
    },
    201
  );
};

exports.updateAgent = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await prisma.agent.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          roleId: true
        }
      },
      _count: { select: { servants: true } }
    }
  });
  if (!existing) throw new ApiError(404, "Agent not found");

  const { agencyName, address, city, latitude, longitude, serviceRadiusKm } = req.body;

  const agent = await prisma.agent.update({
    where: { id },
    data: {
      ...(agencyName !== undefined && { agencyName: agencyName?.trim() || null }),
      ...(address !== undefined && { address: address.trim() }),
      ...(city !== undefined && { city: city?.trim() || null }),
      ...(latitude !== undefined && { latitude: parseFloat(latitude) }),
      ...(longitude !== undefined && { longitude: parseFloat(longitude) }),
      ...(serviceRadiusKm !== undefined && {
        serviceRadiusKm: parseFloat(serviceRadiusKm)
      })
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
          roleId: true
        }
      },
      _count: { select: { servants: true } }
    }
  });

  const [agentWithRevenue] = await attachAnnualRevenueToAgents([agent]);
  sendSuccess(res, { agent: agentWithRevenue });
};

exports.toggleUser = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found");

  if (user.roleId === ROLE_IDS.ADMIN && user.isActive) {
    throw new ApiError(400, "Admin users cannot be deactivated");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !user.isActive },
    select: {
      id: true,
      name: true,
      email: true,
      roleId: true,
      isActive: true,
      role: { select: { id: true, code: true, label: true } }
    }
  });

  sendSuccess(res, { user: serializeUser(updated) });
};

const {
  getPricingConfig: getServicePricingConfig,
  updatePricingConfig: updateServicePricingConfig
} = require("../services/pricingService");

exports.getPricingConfig = async (req, res) => {
  const config = await getServicePricingConfig();
  sendSuccess(res, { pricing: config });
};

exports.updatePricingConfig = async (req, res) => {
  try {
    const config = await updateServicePricingConfig(req.body);
    sendSuccess(res, {
      pricing: config,
      message: "Pricing configuration updated successfully"
    });
  } catch (err) {
    throw new ApiError(400, err.message);
  }
};
