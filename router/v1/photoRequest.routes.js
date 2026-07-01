const express = require("express");
const { validate } = require("../../middlewares/validate.js");
const { protectUser } = require("../../middlewares/routeGuards.js");
const { profileIdBodySchema } = require("../../validators/request.schemas.js");
const photoRequestController = require("../../controllers/v1/photoRequest.controller.js");

const router = express.Router();

router.use(...protectUser);

router.get("/", photoRequestController.getPhotoRequests);
router.post(
  "/",
  validate(profileIdBodySchema),
  photoRequestController.sendPhotoAccessRequest
);
router.delete(
  "/",
  validate(profileIdBodySchema),
  photoRequestController.withdrawPhotoRequest
);
router.post(
  "/accept",
  validate(profileIdBodySchema),
  photoRequestController.acceptPhotoRequest
);
router.post(
  "/reject",
  validate(profileIdBodySchema),
  photoRequestController.rejectPhotoRequest
);
router.delete(
  "/remove",
  validate(profileIdBodySchema),
  photoRequestController.removePhotoRequest
);

module.exports = router;
