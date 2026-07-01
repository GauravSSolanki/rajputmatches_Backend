const { z } = require("zod");

const contactFormSchema = z.object({
  data: z.object({
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    mobile: z.string().regex(/^\d{10}$/, "Mobile must be 10 digits"),
    email: z.string().trim().email(),
    countryCode: z.string().trim().min(1).max(5),
    additionalInfo: z.string().trim().max(2000).optional(),
  }),
});

const publicPageParamSchema = z.object({
  slug: z.string().trim().min(1).max(100),
});

module.exports = {
  contactFormSchema,
  publicPageParamSchema,
};
