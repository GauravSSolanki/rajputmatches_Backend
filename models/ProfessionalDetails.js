const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProfessionalDetailsSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
  qualifications: { type: String, trim: true },
  institution: { type: String, trim: true },
  professional: { type: String, trim: true },
  annualIncome: { type: String },
  hobbies: { type: [String] },
  additionalInfo: { type: String, trim: true, maxlength: 100 },
  class: { type: String, trim: true },
});

module.exports = mongoose.model(
  "ProfessionalDetails",
  ProfessionalDetailsSchema
);
