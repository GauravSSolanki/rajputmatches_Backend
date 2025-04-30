const mongoose = require("mongoose");

const LimitSchema = new mongoose.Schema({
  freeMessageLimit: {
    type: Number,
    required: true,
    min: 0,
    max: 999,
    default: 5,
  },
  freeProfileViews: {
    type: Number,
    required: true,
    min: 0,
    max: 100000,
    default: 2,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Limit", LimitSchema);
