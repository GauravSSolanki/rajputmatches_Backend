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

const Token = mongoose.model("Tokenmodel", TokenSchema);
module.exports = Token;
