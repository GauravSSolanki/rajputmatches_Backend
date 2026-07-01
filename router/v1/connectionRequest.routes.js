const express = require("express");
const { validate } = require("../../middlewares/validate.js");
const { protectUser } = require("../../middlewares/routeGuards.js");
const { profileIdBodySchema } = require("../../validators/request.schemas.js");
const connectionRequestController = require("../../controllers/v1/connectionRequest.controller.js");

const router = express.Router();

router.use(...protectUser);

router.get("/", connectionRequestController.getConnectionRequests);
router.post(
  "/",
  validate(profileIdBodySchema),
  connectionRequestController.sendConnectionRequest
);
router.delete(
  "/sent",
  validate(profileIdBodySchema),
  connectionRequestController.withdrawConnectionRequest
);
router.post(
  "/accept",
  validate(profileIdBodySchema),
  connectionRequestController.acceptConnectionRequest
);
router.post(
  "/reject",
  validate(profileIdBodySchema),
  connectionRequestController.rejectConnectionRequest
);
router.delete(
  "/sent/remove",
  validate(profileIdBodySchema),
  connectionRequestController.removeSentConnectionRequest
);
router.delete(
  "/received/remove",
  validate(profileIdBodySchema),
  connectionRequestController.removeReceivedConnectionRequest
);

module.exports = router;
