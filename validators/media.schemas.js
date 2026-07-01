const { z } = require("zod");
const { objectIdBodySchema } = require("./common.schemas");

const photoPrivacySchema = z.object({
  data: z.boolean(),
});

const setAvatarSchema = objectIdBodySchema;

module.exports = {
  photoPrivacySchema,
  setAvatarSchema,
  deleteMediaSchema: objectIdBodySchema,
};
