const { z } = require("zod");
const { objectIdBodySchema } = require("./common.schemas");

/** Search accepts any filter fields; empty body returns opposite-gender profiles. */
const searchProfilesSchema = z.object({
  data: z.record(z.unknown()).optional().default({}),
});

const profileIdParamSchema = z.object({
  profileId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid profile ID"),
});

module.exports = {
  searchProfilesSchema,
  profileIdBodySchema: objectIdBodySchema,
  profileIdParamSchema,
};
