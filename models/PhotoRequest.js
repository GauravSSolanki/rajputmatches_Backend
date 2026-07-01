const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PhotoRequestSchema = new Schema(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

PhotoRequestSchema.index({ requesterId: 1, ownerId: 1 }, { unique: true });
PhotoRequestSchema.index({ ownerId: 1, status: 1 });
PhotoRequestSchema.index({ requesterId: 1, status: 1 });

const { COLLECTIONS } = require("./collections");

module.exports = mongoose.model(
  "PhotoRequest",
  PhotoRequestSchema,
  COLLECTIONS.PHOTO_ACCESS_REQUESTS
);
