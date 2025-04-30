const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true }, // Make sure 'unique' is not defined
    content: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Page", pageSchema);
