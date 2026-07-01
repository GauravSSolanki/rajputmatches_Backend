const express = require("express");
const { validate } = require("../../middlewares/validate.js");
const { protectUser } = require("../../middlewares/routeGuards.js");
const {
  searchProfilesSchema,
  profileIdParamSchema,
} = require("../../validators/profile.schemas.js");
const { profileIdQuerySchema } = require("../../validators/common.schemas.js");
const profileController = require("../../controllers/v1/profile.controller.js");

const router = express.Router();

router.use(...protectUser);

// Fixed paths first (must come before /:profileId)
router.post("/search", validate(searchProfilesSchema), profileController.searchProfiles);
router.get(
  "/summary",
  validate(profileIdQuerySchema, "query"),
  profileController.getProfileSummary
);
router.get("/me/shortlists", profileController.getShortlistedProfiles);
router.get("/me/visited", profileController.getVisitedProfiles);
router.get("/me/visitors", profileController.getProfileVisitors);

// Profile by id
router.get(
  "/:profileId",
  validate(profileIdParamSchema, "params"),
  profileController.getProfileDetails
);
router.get(
  "/:profileId/photos",
  validate(profileIdParamSchema, "params"),
  profileController.getProfilePhotos
);
router.post(
  "/:profileId/views",
  validate(profileIdParamSchema, "params"),
  profileController.recordProfileView
);
router.post(
  "/:profileId/shortlist",
  validate(profileIdParamSchema, "params"),
  profileController.addProfileToShortlist
);
router.delete(
  "/:profileId/shortlist",
  validate(profileIdParamSchema, "params"),
  profileController.removeProfileFromShortlist
);
router.patch(
  "/:profileId/shortlist/bookmark",
  validate(profileIdParamSchema, "params"),
  profileController.toggleShortlistBookmark
);

module.exports = router;
