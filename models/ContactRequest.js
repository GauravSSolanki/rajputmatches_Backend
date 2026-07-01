const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ContactRequestSchema = new Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },

  mobile: {
    type: String,
    required: true,
    unique: true,
    match: [/^\+?[1-9]\d{1,14}$/, "Please use a valid mobile number"],
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    lowercase: true,
    trim: true,
  },
  additionalInfo: { type: String, default: "", trim: true },
  status: {
    type: String,
    enum: ["pending", "completed", "remark"],
    default: "pending",
  },
  countryCode: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const { COLLECTIONS } = require("./collections");

module.exports = mongoose.model(
  "ContactRequest",
  ContactRequestSchema,
  COLLECTIONS.CONTACT_REQUESTS
);
