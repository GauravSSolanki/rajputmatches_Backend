const mongoose = require("mongoose");

/**
 * Convert a string user/profile id into a MongoDB ObjectId.
 */
function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

module.exports = { toObjectId };
