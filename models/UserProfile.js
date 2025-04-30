const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserProfileSchema = new Schema({
  isVisible: { type: Boolean, default: "true" },
  isbloacked: { type: Boolean, default: "false" },
  isApproved: { type: Boolean, default: "false" },
  avatar: { type: String },
  profilefor: { type: String },
  isEnable: { type: Boolean, default: true },
  firstName: { type: String, required: true },
  middleName: { type: String, default: "" },
  lastName: { type: String, required: true },
  countryCode: { type: String },
  password: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  martrId: { type: Number, required: true },
  view: { type: Number },
  gender: {
    type: String,
    required: true,
    enum: ["Male", "Female", "Other", ""],
    default: "",
  },
  mobile: {
    type: String,
    required: true,
    unique: true,
    match: [/^\+?[1-9]\d{1,14}$/, "Please use a valid mobile number"],
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
  },
  height: {
    feet: { type: Number, min: 1, max: 8, default: 5 },
    inches: { type: Number, min: 0, max: 11, default: 0 },
  },
  weight: { type: Number, default: null },
  reqSentCount: {
    type: Number,
    default: 0,
  },
  maritalStatus: {
    type: String,
    enum: ["Single", "Married", "Divorced", "Widowed", ""],
    default: "",
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
    required: true,
  },

  additionalInfo: { type: String, default: "" },
  isSubscribed: { type: Boolean, default: false },
  address: {
    country: { type: String },
    state: { type: String, required: true },
    district: { type: String, default: "" },
    city: { type: String, required: true },
    street: { type: String, default: "" },
    zipCode: { type: String, default: "" },
  },

  visitedAt: [
    {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
    },
  ],
  viewedBy: [
    {
      type: Schema.Types.ObjectId,
      ref: "UserProfile",
    },
  ],

  shortlisted: [
    {
      profile: {
        type: Schema.Types.ObjectId,
        ref: "UserProfile",
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
  ],

  filesId: { type: Schema.Types.ObjectId, ref: "Photo" },
  HoroscopicId: { type: Schema.Types.ObjectId, ref: "HoroscopeDetails" },
  profdetailsId: {
    type: Schema.Types.ObjectId,
    ref: "ProfessionalDetails",
  },
  familydetailsId: {
    type: Schema.Types.ObjectId,
    ref: "FamilyDetails",
  },

  photoReqSent: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "UserProfile",
      },

      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
    },
  ],
  photoReqReceived: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "UserProfile",
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
    },
  ],

  reqSent: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "UserProfile",
      },

      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
    },
  ],
  reqReceived: [
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "UserProfile", // Reference to the UserProfile model
      },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
    },
  ],
});

module.exports = mongoose.model("UserProfile", UserProfileSchema);
