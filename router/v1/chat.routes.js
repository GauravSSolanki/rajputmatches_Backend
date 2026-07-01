const express = require("express");
const { validate } = require("../../middlewares/validate.js");
const { protectUser } = require("../../middlewares/routeGuards.js");
const {
  sendMessageSchema,
  chatIdBodySchema,
  deleteMessagesSchema,
  createChatSchema,
  updateChatStatusSchema,
  validateChatSchema,
} = require("../../validators/chat.schemas.js");
const chatController = require("../../controllers/v1/chat.controller.js");

const router = express.Router();

router.use(...protectUser);

router.get("/", chatController.listUserChats);
router.get("/pending", chatController.listPendingChats);
router.post("/", validate(createChatSchema), chatController.createOrResumeChat);
router.post(
  "/validate",
  validate(validateChatSchema),
  chatController.validateChatParticipants
);
router.patch(
  "/status",
  validate(updateChatStatusSchema),
  chatController.updateChatRequestStatus
);
router.post("/messages", validate(sendMessageSchema), chatController.sendChatMessage);
router.get(
  "/messages",
  validate(chatIdBodySchema, "query"),
  chatController.listChatMessages
);
router.delete(
  "/messages",
  validate(deleteMessagesSchema),
  chatController.clearChatMessages
);

module.exports = router;
