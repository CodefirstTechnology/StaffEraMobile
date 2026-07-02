const ApiError = require("../utils/ApiError");
const { createNotification } = require("./notificationService");
const {
  findAgentsNearLocation,
  isServantNearAgent,
  agentHasLocation
} = require("./locationService");

const notifyNearbyAgentsOfRegistration = async (servant, { name, city, address }) => {
  if (servant.latitude == null || servant.longitude == null) return [];

  const nearbyAgents = await findAgentsNearLocation(
    servant.latitude,
    servant.longitude
  );

  const areaLabel = city || address || "your area";

  await Promise.all(
    nearbyAgents.map((agent) =>
      createNotification({
        userId: agent.userId,
        title: "New servant registration nearby",
        body: `${name} applied from ${areaLabel}. Review in App registrations.`,
        type: "SERVANT_REGISTRATION_NEARBY",
        data: { servantId: servant.id, agentId: agent.id }
      })
    )
  );

  return nearbyAgents;
};

const assertAgentCanAccessServant = (scope, servant, agent) => {
  if (scope.isAdmin) return;

  if (servant.agentId === scope.agentId) return;

  const isOpenRegistration =
    servant.registrationSource === "SELF" && servant.agentId == null;

  if (!isOpenRegistration) {
    throw new ApiError(404, "Servant not found");
  }

  if (!agentHasLocation(agent)) {
    throw new ApiError(
      400,
      "Set your agency location in Profile to review nearby registrations"
    );
  }

  if (!isServantNearAgent(servant, agent)) {
    throw new ApiError(404, "Servant not found");
  }
};

module.exports = {
  notifyNearbyAgentsOfRegistration,
  assertAgentCanAccessServant
};
