const prisma = require("../config/prisma");

const roundMoney = (n) => Math.round((Number(n) || 0) * 100) / 100;

const getYearBounds = (year = new Date().getFullYear()) => ({
  year,
  start: new Date(year, 0, 1, 0, 0, 0, 0),
  end: new Date(year, 11, 31, 23, 59, 59, 999)
});

const completedBookingsForAgentYear = (agentId, { start, end }) => ({
  status: "COMPLETED",
  updatedAt: { gte: start, lte: end },
  servant: { agentId }
});

const sumAmount = (bookings) =>
  roundMoney(bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0));

const buildMonthlySeries = (bookings, year) => {
  const months = [];
  for (let m = 0; m < 12; m += 1) {
    const monthStart = new Date(year, m, 1);
    const monthEnd = new Date(year, m + 1, 0, 23, 59, 59, 999);
    const inMonth = bookings.filter((b) => {
      const d = new Date(b.updatedAt);
      return d >= monthStart && d <= monthEnd;
    });
    months.push({
      month: monthStart.toLocaleString("en", { month: "short" }),
      count: inMonth.length,
      revenue: sumAmount(inMonth)
    });
  }
  return months;
};

const buildServantBreakdown = (bookings) => {
  const byServant = new Map();
  for (const booking of bookings) {
    if (!booking.servant) continue;
    const key = booking.servantId;
    const existing = byServant.get(key) || {
      servantId: key,
      name: booking.servant.user?.name || "Helper",
      completedBookings: 0,
      revenue: 0
    };
    existing.completedBookings += 1;
    existing.revenue = roundMoney(existing.revenue + (booking.totalAmount || 0));
    byServant.set(key, existing);
  }
  return [...byServant.values()].sort((a, b) => b.revenue - a.revenue);
};

const getAgentAnnualRevenue = async (agentId, year = new Date().getFullYear()) => {
  const bounds = getYearBounds(year);
  const where = completedBookingsForAgentYear(agentId, bounds);

  const [bookings, servantCounts] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: {
        id: true,
        totalAmount: true,
        updatedAt: true,
        servantId: true,
        servant: {
          select: {
            id: true,
            user: { select: { name: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.servant.groupBy({
      by: ["verificationStatus"],
      where: { agentId },
      _count: true
    })
  ]);

  const totalServants = servantCounts.reduce((n, row) => n + row._count, 0);
  const verifiedServants =
    servantCounts.find((row) => row.verificationStatus === "VERIFIED")?._count || 0;

  return {
    year: bounds.year,
    annualRevenue: sumAmount(bookings),
    annualCompletedBookings: bookings.length,
    totalServants,
    verifiedServants,
    revenueByMonth: buildMonthlySeries(bookings, bounds.year),
    servantRevenue: buildServantBreakdown(bookings)
  };
};

/** Attach annual revenue to a list of agent records (admin tables). */
const attachAnnualRevenueToAgents = async (agents, year = new Date().getFullYear()) => {
  if (!agents.length) return agents;

  const bounds = getYearBounds(year);
  const agentIds = agents.map((a) => a.id);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "COMPLETED",
      updatedAt: { gte: bounds.start, lte: bounds.end },
      servant: { agentId: { in: agentIds } }
    },
    select: {
      totalAmount: true,
      servant: { select: { agentId: true } }
    }
  });

  const revenueByAgent = new Map(agentIds.map((id) => [id, 0]));
  const bookingsByAgent = new Map(agentIds.map((id) => [id, 0]));

  for (const booking of bookings) {
    const agentId = booking.servant?.agentId;
    if (!agentId) continue;
    revenueByAgent.set(agentId, roundMoney((revenueByAgent.get(agentId) || 0) + (booking.totalAmount || 0)));
    bookingsByAgent.set(agentId, (bookingsByAgent.get(agentId) || 0) + 1);
  }

  return agents.map((agent) => ({
    ...agent,
    annualRevenue: revenueByAgent.get(agent.id) || 0,
    annualCompletedBookings: bookingsByAgent.get(agent.id) || 0,
    revenueYear: bounds.year
  }));
};

module.exports = {
  getYearBounds,
  getAgentAnnualRevenue,
  attachAnnualRevenueToAgents
};
