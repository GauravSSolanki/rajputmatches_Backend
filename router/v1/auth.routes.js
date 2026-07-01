const express = require("express");
const { isAuth } = require("../../middlewares/middleware.js");
const { validate } = require("../../middlewares/validate.js");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  sendVerificationSchema,
  resetPasswordSchema,
  verifyEmailQuerySchema,
} = require("../../validators/auth.schemas.js");
const authController = require("../../controllers/v1/auth.controller.js");

const router = express.Router();

// Public auth routes
router.post("/register", validate(registerSchema), authController.registerUser);
router.post("/login", validate(loginSchema), authController.loginUser);
router.post("/logout", authController.logoutUser);
router.post(
  "/password/forgot",
  validate(forgotPasswordSchema),
  authController.sendForgotPasswordLink
);
router.post(
  "/email/send-verification",
  validate(sendVerificationSchema),
  authController.sendEmailVerification
);
router.get(
  "/email/verify",
  validate(verifyEmailQuerySchema, "query"),
  authController.verifyEmailToken
);

// Protected auth routes
router.post(
  "/password/reset",
  isAuth,
  validate(resetPasswordSchema),
  authController.changePassword
);

module.exports = router;
