const { z } = require("zod");

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

const sendMessageSchema = z.object({
  chatId: objectId,
  message: z.string().trim().min(1).max(2000),
});

const chatIdBodySchema = z.object({
  chatId: objectId,
});

const deleteMessagesSchema = z.object({
  chatId: objectId,
  deleteForAll: z.boolean().optional(),
});

const createChatSchema = z.object({
  data: z.object({
    user2: objectId,
    message: z.string().trim().min(1).max(2000).optional(),
  }),
});

const updateChatStatusSchema = z
  .object({
    chatId: objectId,
    status: z.enum(["accepted", "rejected", "other"]).optional(),
    action: z.enum(["accepted", "rejected", "other"]).optional(),
  })
  .refine((value) => value.status || value.action, {
    message: "status or action is required",
  });

const validateChatSchema = z
  .object({
    user2: objectId.optional(),
    profileId: objectId.optional(),
  })
  .refine((value) => value.user2 || value.profileId, {
    message: "user2 or profileId is required",
  });

module.exports = {
  sendMessageSchema,
  chatIdBodySchema,
  deleteMessagesSchema,
  createChatSchema,
  updateChatStatusSchema,
  validateChatSchema,
};
