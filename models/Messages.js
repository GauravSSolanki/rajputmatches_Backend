const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserProfile",
      },
    ],
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserProfile",
      },
    ],
  },
  { timestamps: true }
);

const { COLLECTIONS } = require("./collections");

module.exports = mongoose.model("Message", MessageSchema, COLLECTIONS.CHAT_MESSAGES);
