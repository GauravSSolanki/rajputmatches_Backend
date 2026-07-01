const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProfileConnectionRequestSchema = new Schema(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    receiverId: {
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

ProfileConnectionRequestSchema.index(
  { requesterId: 1, receiverId: 1 },
  { unique: true }
);
ProfileConnectionRequestSchema.index({ receiverId: 1, status: 1 });
ProfileConnectionRequestSchema.index({ requesterId: 1, status: 1 });

const { COLLECTIONS } = require("./collections");

module.exports = mongoose.model(
  "ProfileConnectionRequest",
  ProfileConnectionRequestSchema,
  COLLECTIONS.CONNECTION_REQUESTS
);
