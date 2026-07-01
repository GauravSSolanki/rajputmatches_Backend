const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "UserProfile",
  },
  token: {
    type: String,
    required: true,
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
    expires: 6000,
  },
});

const { COLLECTIONS } = require("./collections");

const PasswordResetToken = mongoose.model(
  "PasswordResetToken",
  TokenSchema,
  COLLECTIONS.PASSWORD_RESET_TOKENS
);

module.exports = PasswordResetToken;
