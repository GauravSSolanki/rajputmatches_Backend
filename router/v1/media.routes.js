const express = require("express");
const { multipleFileUpload } = require("../../middlewares/middleware.js");
const { validate } = require("../../middlewares/validate.js");
const { protectUser } = require("../../middlewares/routeGuards.js");
const {
  photoPrivacySchema,
  setAvatarSchema,
  deleteMediaSchema,
} = require("../../validators/media.schemas.js");
const mediaController = require("../../controllers/v1/media.controller.js");

const router = express.Router();

router.use(...protectUser);

router.get("/", mediaController.getOrCreateMediaAlbum);
router.get("/avatar", mediaController.getAvatarPhoto);
router.post("/photos", multipleFileUpload, mediaController.uploadPhotos);
router.post("/documents", multipleFileUpload, mediaController.uploadDocuments);
router.patch("/avatar", validate(setAvatarSchema), mediaController.setAvatarPhoto);
router.delete("/files", validate(deleteMediaSchema), mediaController.deleteMediaFile);
router.patch(
  "/privacy",
  validate(photoPrivacySchema),
  mediaController.updatePhotoPrivacy
);

module.exports = router;
