const prisma = require("../config/prisma");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");

const getServantForUser = async (userId) => {
  const servant = await prisma.servant.findUnique({ where: { userId } });
  if (!servant) throw new ApiError(404, "Servant profile not found");
  return servant;
};

exports.listMyZones = async (req, res) => {
  const servant = await getServantForUser(req.user.id);
  const zones = await prisma.zone.findMany({
    where: { servantId: servant.id },
    orderBy: { name: "asc" }
  });
  sendSuccess(res, { zones });
};

