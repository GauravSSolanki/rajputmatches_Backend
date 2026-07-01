const { z } = require("zod");
const { GENDERS } = require("../utils/constants");

const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  middleName: z.string().trim().max(50).optional(),
  email: z.string().trim().email(),
  mobile: z.string().regex(/^\d{10}$/, "Mobile must be 10 digits"),
  countryCode: z.string().trim().min(1).max(5),
  password: z.string().min(6).max(128),
  dateOfBirth: z.coerce.date(),
  gender: z.enum([GENDERS.MALE, GENDERS.FEMALE, GENDERS.OTHER]),
  profilefor: z.string().trim().max(50).optional(),
  country: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  street: z.string().trim().max(200).optional(),
  zipCode: z.string().trim().max(20).optional(),
});

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  username: z.string().trim().min(1),
});

const sendVerificationSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6),
  newPassword: z.string().min(6),
});

const verifyEmailQuerySchema = z.object({
  token: z.string().trim().min(1),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  sendVerificationSchema,
  resetPasswordSchema,
  verifyEmailQuerySchema,
};
