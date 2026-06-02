const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateRefreshTokenString
} = require("../utils/jwt");
const logger = require("../utils/logger");
const { normalizeEmail, normalizePhone } = require("../utils/normalize");

const sanitizeUser = (user) => {
  const { password, ...rest } = user;
  return rest;
};

const issueTokens = async (user) => {
  const accessToken = signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role
  });

  const refreshTokenStr = generateRefreshTokenString();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      token: refreshTokenStr,
      userId: user.id,
      expiresAt
    }
  });

  const refreshToken = signRefreshToken({ id: user.id, token: refreshTokenStr });

  return { accessToken, refreshToken, refreshTokenStr };
};

exports.registerOwner = async (req, res) => {
  const { name, password, address, city, latitude, longitude } = req.body;
  const email = normalizeEmail(req.body.email);
  const phone = normalizePhone(req.body.phone);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] }
  });
  if (existing) throw new ApiError(400, "Email or phone already registered");

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      password: hashed,
      role: "HOUSE_OWNER",
      houseOwner: {
        create: {
          address,
          city,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined
        }
      }
    },
    include: { houseOwner: true }
  });

  const tokens = await issueTokens(user);
  logger.info("House owner registered", { userId: user.id });

  sendSuccess(
    res,
    { user: sanitizeUser(user), ...tokens },
    201
  );
};

exports.login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { houseOwner: true, servant: true, agent: true }
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid email or password");
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  if (user.role === "SERVANT" && !user.servant) {
    throw new ApiError(403, "Servant profile not found. Contact your agent.");
  }

  const tokens = await issueTokens(user);

  sendSuccess(res, { user: sanitizeUser(user), ...tokens });
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token: decoded.token },
    include: { user: true }
  });

  if (!stored || stored.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token expired");
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });
  const tokens = await issueTokens(stored.user);

  sendSuccess(res, tokens);
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await prisma.refreshToken.deleteMany({
        where: { token: decoded.token, userId: req.user.id }
      });
    } catch {
      await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });
    }
  } else {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });
  }

  sendSuccess(res, { message: "Logged out" });
};

exports.me = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      houseOwner: true,
      servant: { include: { skills: true, zones: true } },
      agent: true
    }
  });

  if (!user) throw new ApiError(404, "User not found");

  sendSuccess(res, { user: sanitizeUser(user) });
};

exports.updateLocation = async (req, res) => {
  if (req.user.role !== "HOUSE_OWNER") {
    throw new ApiError(403, "Only house owners can update home location");
  }

  const houseOwner = await prisma.houseOwner.findUnique({
    where: { userId: req.user.id }
  });
  if (!houseOwner) throw new ApiError(404, "House owner profile not found");

  const { address, flatNo, building, area, city, latitude, longitude } = req.body;

  const updated = await prisma.houseOwner.update({
    where: { id: houseOwner.id },
    data: {
      ...(address !== undefined && { address }),
      ...(flatNo !== undefined && { flatNo: flatNo || null }),
      ...(building !== undefined && { building: building || null }),
      ...(area !== undefined && { area: area || null }),
      ...(city !== undefined && { city }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude })
    }
  });

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { houseOwner: true, servant: true, agent: true }
  });

  sendSuccess(res, { houseOwner: updated, user: sanitizeUser(user) });
};

const resetTokens = new Map();

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, { userId: user.id, expires: Date.now() + 3600000 });
    logger.info("Password reset requested", { email });
  }

  sendSuccess(res, {
    message: "If the email exists, a reset link has been sent"
  });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const entry = resetTokens.get(token);

  if (!entry || entry.expires < Date.now()) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: entry.userId },
    data: { password: hashed }
  });

  resetTokens.delete(token);
  sendSuccess(res, { message: "Password updated" });
};
