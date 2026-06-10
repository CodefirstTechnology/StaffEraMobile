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

const generateAgentPassword = () => {
  const part = crypto.randomBytes(4).toString("hex");
  return `Ag${part}1`;
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
    bookingsByMonth
  });
};

exports.listUsers = async (req, res) => {
  const { role, search, isActive } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);

  const where = {
    ...roleWhereByCode(role),
    ...(isActive !== undefined ? { isActive: isActive === "true" } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } }
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
        roleId: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, code: true, label: true } }
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
            createdAt: true
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
    generatePassword
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
          longitude: parseFloat(longitude)
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

exports.toggleUser = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found");

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
