const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/jwt");
const { userWithRoleInclude, getRoleCode } = require("../services/roleService");
const { INACTIVE_ACCOUNT_MESSAGE } = require("../constants/authMessages");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication required"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        ...userWithRoleInclude,
        houseOwner: true,
        servant: true,
        agent: true
      }
    });

    if (!user) {
      return next(new ApiError(401, "Invalid or expired token"));
    }

    if (!user.isActive) {
      return next(new ApiError(403, INACTIVE_ACCOUNT_MESSAGE));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: getRoleCode(user),
      roleId: user.roleId,
      name: user.name,
      houseOwner: user.houseOwner,
      servant: user.servant,
      agent: user.agent
    };

    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
};

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    next();
  };

module.exports = { authenticate, requireRole };
