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

exports.createZone = async (req, res) => {
  const servant = await getServantForUser(req.user.id);
  const { name, description, city } = req.body;

  if (!name?.trim()) throw new ApiError(400, "Zone name is required");

  const zone = await prisma.zone.create({
    data: {
      servantId: servant.id,
      name: name.trim(),
      description: description?.trim() || null,
      city: city?.trim() || null
    }
  });

  sendSuccess(res, { zone }, 201);
};

exports.updateZone = async (req, res) => {
  const servant = await getServantForUser(req.user.id);
  const id = parseInt(req.params.id, 10);

  const existing = await prisma.zone.findFirst({
    where: { id, servantId: servant.id }
  });
  if (!existing) throw new ApiError(404, "Zone not found");

  const { name, description, city } = req.body;
  const zone = await prisma.zone.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && {
        description: description?.trim() || null
      }),
      ...(city !== undefined && { city: city?.trim() || null })
    }
  });

  sendSuccess(res, { zone });
};

exports.deleteZone = async (req, res) => {
  const servant = await getServantForUser(req.user.id);
  const id = parseInt(req.params.id, 10);

  const existing = await prisma.zone.findFirst({
    where: { id, servantId: servant.id }
  });
  if (!existing) throw new ApiError(404, "Zone not found");

  await prisma.zone.delete({ where: { id } });
  sendSuccess(res, { message: "Zone deleted" });
};
