const { z } = require("zod");

const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/** Optional trimmed string with max length. */
function optionalText(maxLength) {
  return z.union([z.string().trim().max(maxLength), z.literal("")]).optional();
}

/** Body shape used by many update APIs: { data: { ...fields } } */
function bodyWithData(dataSchema) {
  return z.object({
    data: dataSchema.refine((fields) => Object.keys(fields).length > 0, {
      message: "At least one field is required in data",
    }),
  });
}

/** Body shape: { data: "<mongoId>" } */
const mongoIdBodySchema = z.object({
  data: z.string().regex(MONGO_ID_REGEX, "Invalid profile ID"),
});

/** URL param: /profiles/:profileId */
const profileIdParamSchema = z.object({
  profileId: z.string().regex(MONGO_ID_REGEX, "Invalid profile ID"),
});

/** Query param: ?profileId=... */
const profileIdQuerySchema = z.object({
  profileId: z.string().regex(MONGO_ID_REGEX, "Invalid profile ID"),
});

module.exports = {
  optionalText,
  bodyWithData,
  mongoIdBodySchema,
  profileIdParamSchema,
  profileIdQuerySchema,
  // Keep old names for existing imports
  trimmedString: optionalText,
  withData: bodyWithData,
  objectIdBodySchema: mongoIdBodySchema,
};
