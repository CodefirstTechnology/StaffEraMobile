const prisma = require("../config/prisma");
const { ROLE_IDS } = require("./roleService");

const DEFAULT_RADIUS_KM = Number(process.env.SERVANT_AGENT_RADIUS_KM) || 3;
const KM_PER_DEGREE_LAT = 111;

const toRad = (deg) => (deg * Math.PI) / 180;

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isNearPoint = (lat, lng, pointLat, pointLng, radiusKm = DEFAULT_RADIUS_KM) => {
  if (lat == null || lng == null || pointLat == null || pointLng == null) return false;
  return haversineKm(lat, lng, pointLat, pointLng) <= radiusKm;
};

const servantCoversLocation = (servant, latitude, longitude, radiusKm = DEFAULT_RADIUS_KM) => {
  const zones = servant.zones || [];
  if (!zones.length) return false;
  return zones.some((zone) =>
    isNearPoint(latitude, longitude, zone.latitude, zone.longitude, radiusKm)
  );
};

const bookingMatchesServantSkill = (booking, servant) => {
  if (!booking.requestedSkill) return true;
  const wanted = String(booking.requestedSkill).toUpperCase();
  return (servant.skills || []).some((s) => String(s.skillName).toUpperCase() === wanted);
};

const findServantsNearLocation = async (
  latitude,
  longitude,
  { skill, radiusKm = DEFAULT_RADIUS_KM } = {}
) => {
  const servants = await prisma.servant.findMany({
    where: {
      verificationStatus: "VERIFIED",
      user: { isActive: true },
      ...(skill
        ? { skills: { some: { skillName: { equals: skill, mode: "insensitive" } } } }
        : {})
    },
    include: {
      user: { select: { id: true, name: true } },
      skills: true,
      zones: true
    }
  });

  return servants.filter((servant) => servantCoversLocation(servant, latitude, longitude, radiusKm));
};

const agentHasLocation = (agent) =>
  agent?.latitude != null &&
  agent?.longitude != null &&
  !Number.isNaN(agent.latitude) &&
  !Number.isNaN(agent.longitude);

const isServantNearAgent = (servant, agent, radiusKm = DEFAULT_RADIUS_KM) => {
  if (!agentHasLocation(agent)) return false;
  if (servant?.latitude == null || servant?.longitude == null) return false;
  return isNearPoint(
    servant.latitude,
    servant.longitude,
    agent.latitude,
    agent.longitude,
    radiusKm
  );
};

const boundingBoxForRadius = (latitude, longitude, radiusKm = DEFAULT_RADIUS_KM) => {
  const latDelta = radiusKm / KM_PER_DEGREE_LAT;
  const lngDelta =
    radiusKm / (KM_PER_DEGREE_LAT * Math.cos(toRad(latitude)) || 1);
  return {
    latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
    longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta }
  };
};

const filterServantsNearAgent = (servants, agent, radiusKm = DEFAULT_RADIUS_KM) =>
  servants.filter((servant) => isServantNearAgent(servant, agent, radiusKm));

const findAgentsNearLocation = async (
  latitude,
  longitude,
  { radiusKm = DEFAULT_RADIUS_KM, activeOnly = true } = {}
) => {
  if (latitude == null || longitude == null) return [];

  const box = boundingBoxForRadius(latitude, longitude, radiusKm);
  const agents = await prisma.agent.findMany({
    where: {
      latitude: box.latitude,
      longitude: box.longitude,
      ...(activeOnly
        ? { user: { isActive: true, roleId: ROLE_IDS.AGENT } }
        : { user: { roleId: ROLE_IDS.AGENT } })
    },
    include: {
      user: { select: { id: true, name: true, email: true, isActive: true } }
    }
  });

  return agents
    .filter((agent) => isNearPoint(latitude, longitude, agent.latitude, agent.longitude, radiusKm))
    .sort(
      (a, b) =>
        haversineKm(latitude, longitude, a.latitude, a.longitude) -
        haversineKm(latitude, longitude, b.latitude, b.longitude)
    );
};

module.exports = {
  DEFAULT_RADIUS_KM,
  haversineKm,
  isNearPoint,
  agentHasLocation,
  isServantNearAgent,
  boundingBoxForRadius,
  filterServantsNearAgent,
  servantCoversLocation,
  bookingMatchesServantSkill,
  findServantsNearLocation,
  findAgentsNearLocation
};
