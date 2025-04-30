const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StorySchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
  status: {
    type: Boolean,
    required: true,
    default: true,
  },
});

module.exports = mongoose.model("Stories", StorySchema);
