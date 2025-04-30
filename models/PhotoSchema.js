const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PhotoSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
  photos: [
    {
      url: { type: String, required: true },
      isAvatar: { type: Boolean, default: false },
    },
  ],
  documents: [
    {
      url: { type: String, required: true },
    },
  ],

  isPrivate: { type: Boolean, default: false },
});

// Validation to ensure no more than 10 photos are added
PhotoSchema.pre("save", function (next) {
  if (this.photos.length > 10) {
    const error = new Error("Maximum of 10 photos allowed");
    next(error);
  } else {
    next();
  }
});

module.exports = mongoose.model("Photo", PhotoSchema);
