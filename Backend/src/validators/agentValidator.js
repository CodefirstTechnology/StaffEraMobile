const { z } = require("zod");

const emptyToUndefined = (val) =>
  val === undefined || val === null || String(val).trim() === "" ? undefined : val;

const updateAgentProfileSchema = z.object({
  body: z.object({
    agencyName: z.preprocess(emptyToUndefined, z.string().optional()),
    address: z.string().min(5, "Agency location address is required"),
    city: z.preprocess(emptyToUndefined, z.string().optional()),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180)
  })
});

module.exports = {
  updateAgentProfileSchema
};
