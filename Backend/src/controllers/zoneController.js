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

exports.createMyZone = async (req, res) => {
  const servant = await getServantForUser(req.user.id);
  const { name, description, city, latitude, longitude } = req.body;

  if (!name?.trim()) throw new ApiError(400, "Zone name is required");
  if (!city?.trim()) throw new ApiError(400, "City is required");

  const zone = await prisma.zone.create({
    data: {
      servantId: servant.id,
      name: name.trim(),
      description: description?.trim() || null,
      city: city.trim(),
      latitude: latitude ?? undefined,
      longitude: longitude ?? undefined
    }
  });

  sendSuccess(res, { zone }, 201);
};

