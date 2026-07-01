const mongoose = require("mongoose");
const { Schema } = mongoose;

const EmailVerificationTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "UserProfile",
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 150,
  },
});

const { COLLECTIONS } = require("./collections");

const EmailVerificationToken = mongoose.model(
  "EmailVerificationToken",
  EmailVerificationTokenSchema,
  COLLECTIONS.EMAIL_VERIFICATION_TOKENS
);
module.exports = EmailVerificationToken;
