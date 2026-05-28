const { z } = require("zod");

const createZoneSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    city: z.string().max(120).optional()
  })
});

const updateZoneSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    city: z.string().max(120).optional()
  })
});

module.exports = { createZoneSchema, updateZoneSchema };
