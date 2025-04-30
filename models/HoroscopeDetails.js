const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HoroscopeDetailsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },

  dateOfBirth: { type: String, default: "" },

  birthHour: { type: String },
  birthMinute: { type: String },
  birthTimePeriod: { type: String, enum: ["AM", "PM"], default: "AM" },
  birthplace: { type: String, default: "" },
  birthCity: { type: String, default: "" },
  birthState: { type: String, default: "" },
  birthCountry: { type: String, default: "" },
  maglik: { type: String, enum: ["Yes", "No", ""] },
  religion: { type: String, default: "Hindu" },
  clan: { type: String, default: "" },
  subclan: { type: String, default: "" },
  gotra: { type: String, default: "" },
  additionalInfo: { type: String, default: "No additional info" },
});

module.exports = mongoose.model("HoroscopeDetails", HoroscopeDetailsSchema);
