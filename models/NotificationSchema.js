const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    type: { type: String, enum: ["registration", "login"], required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    avatar: { type: String },
  },
  { timestamps: true }
);

const { COLLECTIONS } = require("./collections");

module.exports = mongoose.model(
  "Notification",
  notificationSchema,
  COLLECTIONS.NOTIFICATIONS
);
