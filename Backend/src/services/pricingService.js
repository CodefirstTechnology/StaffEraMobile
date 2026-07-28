const prisma = require("../config/prisma");

const DEFAULT_PRICING = {
  minHourlyRate: 50,
  maxHourlyRate: 1000,
  minMonthlyRate: 3000,
  maxMonthlyRate: 50000,
  platformFeePercentage: 10,
};

async function getPricingConfig() {
  try {
    let config = await prisma.pricingConfig.findUnique({ where: { id: 1 } });
    if (!config) {
      config = await prisma.pricingConfig.create({
        data: { id: 1, ...DEFAULT_PRICING },
      });
    }
    return config;
  } catch (err) {
    return DEFAULT_PRICING;
  }
}

async function updatePricingConfig(data) {
  const minHourlyRate = parseFloat(data.minHourlyRate);
  const maxHourlyRate = parseFloat(data.maxHourlyRate);
  const minMonthlyRate = parseFloat(data.minMonthlyRate);
  const maxMonthlyRate = parseFloat(data.maxMonthlyRate);
  const platformFeePercentage = parseFloat(data.platformFeePercentage ?? 10);

  if (Number.isNaN(minHourlyRate) || minHourlyRate < 0) {
    throw new Error("Minimum hourly rate must be a valid positive number");
  }
  if (Number.isNaN(maxHourlyRate) || maxHourlyRate < minHourlyRate) {
    throw new Error("Maximum hourly rate must be greater than or equal to minimum hourly rate");
  }
  if (Number.isNaN(minMonthlyRate) || minMonthlyRate < 0) {
    throw new Error("Minimum monthly rate must be a valid positive number");
  }
  if (Number.isNaN(maxMonthlyRate) || maxMonthlyRate < minMonthlyRate) {
    throw new Error("Maximum monthly rate must be greater than or equal to minimum monthly rate");
  }
  if (Number.isNaN(platformFeePercentage) || platformFeePercentage < 0 || platformFeePercentage > 100) {
    throw new Error("Platform fee percentage must be between 0 and 100%");
  }

  const config = await prisma.pricingConfig.upsert({
    where: { id: 1 },
    update: {
      minHourlyRate,
      maxHourlyRate,
      minMonthlyRate,
      maxMonthlyRate,
      platformFeePercentage,
    },
    create: {
      id: 1,
      minHourlyRate,
      maxHourlyRate,
      minMonthlyRate,
      maxMonthlyRate,
      platformFeePercentage,
    },
  });

  return config;
}

function calculateBookingPrice({
  bookingType,
  hourlyRate = 0,
  monthlyRate = 0,
  sessionHours = 1,
  monthsCount = 1,
  platformFeePercentage = 10,
}) {
  let baseRate = 0;
  let subtotal = 0;
  let durationText = "";

  if (bookingType === "SESSION") {
    baseRate = Number(hourlyRate) || 0;
    const hours = Math.max(1, Number(sessionHours) || 1);
    subtotal = baseRate * hours;
    durationText = `${hours} hour${hours > 1 ? "s" : ""}`;
  } else if (bookingType === "MONTHLY") {
    baseRate = Number(monthlyRate) || 0;
    const months = Math.max(1, Number(monthsCount) || 1);
    subtotal = baseRate * months;
    durationText = `${months} month${months > 1 ? "s" : ""}`;
  }

  const feePct = Number(platformFeePercentage) || 0;
  const platformFee = Math.round(subtotal * (feePct / 100) * 100) / 100;
  const totalAmount = Math.round((subtotal + platformFee) * 100) / 100;

  return {
    bookingType,
    baseRate,
    durationText,
    subtotal,
    platformFeePercentage: feePct,
    platformFee,
    totalAmount,
  };
}

module.exports = {
  getPricingConfig,
  updatePricingConfig,
  calculateBookingPrice,
  DEFAULT_PRICING,
};
