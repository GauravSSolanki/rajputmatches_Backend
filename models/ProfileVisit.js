const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProfileVisitSchema = new Schema(
  {
    visitorId: {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    visitedUserId: {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    visitedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

ProfileVisitSchema.index({ visitorId: 1, visitedUserId: 1 }, { unique: true });
ProfileVisitSchema.index({ visitedUserId: 1, visitedAt: -1 });
ProfileVisitSchema.index({ visitorId: 1, visitedAt: -1 });

const { COLLECTIONS } = require("./collections");

module.exports = mongoose.model(
  "ProfileVisit",
  ProfileVisitSchema,
  COLLECTIONS.PROFILE_VISITS
);
