const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  name: { type: String, default: "matrimonyId" },
  value: { type: Number, required: true, default: 1000 },
});

const { COLLECTIONS } = require("./collections");

const Counter = mongoose.model("Counter", counterSchema, COLLECTIONS.ID_COUNTERS);
module.exports = Counter;
