const prisma = require("../config/prisma");

const DEFAULT_RADIUS_KM = 15;

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

module.exports = {
  DEFAULT_RADIUS_KM,
  haversineKm,
  isNearPoint,
  servantCoversLocation,
  bookingMatchesServantSkill,
  findServantsNearLocation
};
