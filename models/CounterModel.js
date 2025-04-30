const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  name: { type: String, default: "matrimonyId" },
  value: { type: Number, required: true, default: 1000 },
});

const Counter = mongoose.model("Counter", counterSchema);
module.exports = Counter;
