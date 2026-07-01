const jwt = require("jsonwebtoken");
const { IdCounter: Counter } = require("../models");

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function getNextMatrimonyId() {
  const counter = await Counter.findOneAndUpdate(
    { name: "matrimonyId" },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (counter.value === 1) {
    counter.value = 1000;
    await counter.save();
  }

  return counter.value;
}

module.exports = {
  generateToken,
  verifyToken,
  getNextMatrimonyId,
};
