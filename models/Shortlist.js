const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ShortlistSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
      required: true,
    },
    isbookmarked: {
      type: Boolean,
      default: false,
    },
    dateShortlisted: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

ShortlistSchema.index({ userId: 1, profileId: 1 }, { unique: true });
ShortlistSchema.index({ userId: 1, dateShortlisted: -1 });

const { COLLECTIONS } = require("./collections");

module.exports = mongoose.model("Shortlist", ShortlistSchema, COLLECTIONS.SHORTLISTS);
