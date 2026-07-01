const express = require("express");
const { validate } = require("../../middlewares/validate.js");
const {
  contactFormSchema,
  publicPageParamSchema,
} = require("../../validators/public.schemas.js");
const publicController = require("../../controllers/v1/public.controller.js");

const router = express.Router();

router.post("/contact", validate(contactFormSchema), publicController.submitContactForm);
router.get(
  "/pages/:slug",
  validate(publicPageParamSchema, "params"),
  publicController.getPublicPage
);

module.exports = router;
