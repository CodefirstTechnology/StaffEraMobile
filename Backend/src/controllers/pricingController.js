const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const { getPricingConfig, calculateBookingPrice } = require("../services/pricingService");

exports.getPublicPricingConfig = async (req, res) => {
  const config = await getPricingConfig();
  sendSuccess(res, { pricing: config });
};

exports.calculatePrice = async (req, res) => {
  const { servantId, bookingType, sessionHours, monthsCount } = req.body;
  const config = await getPricingConfig();

  let hourlyRate = 0;
  let monthlyRate = 0;

  if (servantId) {
    const servant = await prisma.servant.findUnique({
      where: { id: Number(servantId) },
      select: { hourlyRate: true, monthlyRate: true },
    });
    if (servant) {
      hourlyRate = servant.hourlyRate || config.minHourlyRate;
      monthlyRate = servant.monthlyRate || config.minMonthlyRate;
    }
  } else {
    hourlyRate = config.minHourlyRate;
    monthlyRate = config.minMonthlyRate;
  }

  const breakdown = calculateBookingPrice({
    bookingType: bookingType || "SESSION",
    hourlyRate,
    monthlyRate,
    sessionHours,
    monthsCount,
    platformFeePercentage: config.platformFeePercentage,
  });

  sendSuccess(res, { breakdown });
};
