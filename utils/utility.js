const jwt = require("jsonwebtoken");
const Counter = require("../models/CounterModel");
const Tokencollection = require("../models/tokenSchema");

exports.generateToken = (userId) => {
  try {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });
  } catch (error) {
    console.error("Token generation failed:", error);
    throw new Error("Failed to generate token");
  }
};

exports.verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

exports.getNextMatrimonyId = async () => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { name: "matrimonyId" },
      { $inc: { value: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    if (counter.value === 1) {
      counter.value = 1000;
      await counter.save();
    }

    return counter.value;
  } catch (error) {
    console.error("Error generating Matrimony ID:", error);
    throw new Error("Failed to generate Matrimony ID");
  }
};
