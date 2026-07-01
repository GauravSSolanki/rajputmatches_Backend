const mongoose = require("mongoose");

const verifiedEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const { COLLECTIONS } = require("./collections");

module.exports = mongoose.model(
  "VerifiedEmail",
  verifiedEmailSchema,
  COLLECTIONS.VERIFIED_EMAILS
);
