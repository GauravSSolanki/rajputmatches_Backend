const express = require("express");
const { validate } = require("../../middlewares/validate.js");
const { protectUser } = require("../../middlewares/routeGuards.js");
const {
  updateBasicProfileSchema,
  updateProfessionalSchema,
  updateHoroscopeSchema,
  updateFamilySchema,
  updateExtendedFamilySchema,
} = require("../../validators/me.schemas.js");
const meController = require("../../controllers/v1/me.controller.js");

const router = express.Router();

router.use(...protectUser);

router.get("/", meController.getCurrentUserProfile);

router.patch(
  "/basic",
  validate(updateBasicProfileSchema),
  meController.updateBasicProfile
);

router.get("/professional", meController.getProfessionalDetails);
router.patch(
  "/professional",
  validate(updateProfessionalSchema),
  meController.updateProfessionalDetails
);

router.get("/horoscope", meController.getHoroscopeDetails);
router.patch(
  "/horoscope",
  validate(updateHoroscopeSchema),
  meController.updateHoroscopeDetails
);

router.get("/family", meController.getFamilyDetails);
router.patch(
  "/family",
  validate(updateFamilySchema),
  meController.updateFamilyDetails
);

router.get("/extended-family", meController.getExtendedFamilyDetails);
router.patch(
  "/extended-family",
  validate(updateExtendedFamilySchema),
  meController.updateExtendedFamilyDetails
);

module.exports = router;
