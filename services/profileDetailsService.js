const mongoose = require("mongoose");
const {
  MatrimonialUser,
  ProfessionalProfile,
  HoroscopeProfile,
  FamilyProfile,
  ExtendedFamilyProfile,
} = require("../models");

const USER_PROFILE_SELECT = "-password -__v";

const USER_POPULATE = [
  { path: "filesId", select: "photos isPrivate documents" },
  { path: "HoroscopicId" },
  { path: "profdetailsId" },
  { path: "familydetailsId" },
];

const BLOCKED_BASIC_UPDATE_FIELDS = new Set([
  "password",
  "email",
  "mobile",
  "countryCode",
  "role",
  "martrId",
  "reqSentCount",
  "isApproved",
  "isbloacked",
  "isEnable",
  "isSubscribed",
  "filesId",
  "HoroscopicId",
  "profdetailsId",
  "familydetailsId",
  "view",
  "avatar",
  "_id",
  "userId",
  "__v",
]);

function toObjectId(userId) {
  return new mongoose.Types.ObjectId(userId);
}

async function linkUserReference(userId, refField, docId) {
  const user = await MatrimonialUser.findById(userId).select(refField);
  if (!user) {
    return null;
  }
  if (!user[refField]) {
    user[refField] = docId;
    await user.save();
  }
  return user;
}

async function findOrCreateProfile(Model, userId, refField) {
  const userObjectId = toObjectId(userId);
  let doc = await Model.findOne({ userId: userObjectId });

  if (doc) {
    return { doc, created: false };
  }

  doc = await Model.create({ userId: userObjectId });
  if (refField) {
    await linkUserReference(userId, refField, doc._id);
  }

  return { doc, created: true };
}

async function upsertUserProfile(Model, userId, data, refField) {
  const userObjectId = toObjectId(userId);
  const doc = await Model.findOneAndUpdate(
    { userId: userObjectId },
    { $set: data },
    {
      new: true,
      runValidators: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  if (refField) {
    await linkUserReference(userId, refField, doc._id);
  }

  return doc;
}

async function getUserProfile(userId) {
  const user = await MatrimonialUser.findById(userId)
    .select(USER_PROFILE_SELECT)
    .populate(USER_POPULATE);

  if (!user) {
    return null;
  }

  const extendedFamily = await ExtendedFamilyProfile.findOne({
    userId: toObjectId(userId),
  }).select("-__v");

  const profile = user.toObject();
  profile.extendedFamily = extendedFamily;

  return profile;
}

async function updateBasicProfile(userId, data) {
  const safeData = { ...data };
  for (const key of Object.keys(safeData)) {
    if (BLOCKED_BASIC_UPDATE_FIELDS.has(key)) {
      delete safeData[key];
    }
  }

  if (Object.keys(safeData).length === 0) {
    const err = new Error("No valid fields to update");
    err.statusCode = 400;
    throw err;
  }

  const updated = await MatrimonialUser.findByIdAndUpdate(userId, safeData, {
    new: true,
    runValidators: true,
  }).select(USER_PROFILE_SELECT);

  if (!updated) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  return updated;
}

async function getProfessionalProfile(userId) {
  return findOrCreateProfile(ProfessionalProfile, userId, "profdetailsId");
}

async function updateProfessionalProfile(userId, data) {
  return upsertUserProfile(ProfessionalProfile, userId, data, "profdetailsId");
}

async function getHoroscopeProfile(userId) {
  return findOrCreateProfile(HoroscopeProfile, userId, "HoroscopicId");
}

async function updateHoroscopeProfile(userId, data) {
  return upsertUserProfile(HoroscopeProfile, userId, data, "HoroscopicId");
}

async function getFamilyProfile(userId) {
  return findOrCreateProfile(FamilyProfile, userId, "familydetailsId");
}

async function updateFamilyProfile(userId, data) {
  return upsertUserProfile(FamilyProfile, userId, data, "familydetailsId");
}

async function getExtendedFamilyProfile(userId) {
  return findOrCreateProfile(ExtendedFamilyProfile, userId, null);
}

async function updateExtendedFamilyProfile(userId, data) {
  const { doc } = await findOrCreateProfile(ExtendedFamilyProfile, userId, null);
  Object.assign(doc, data);
  await doc.save();
  return doc;
}

module.exports = {
  getUserProfile,
  updateBasicProfile,
  getProfessionalProfile,
  updateProfessionalProfile,
  getHoroscopeProfile,
  updateHoroscopeProfile,
  getFamilyProfile,
  updateFamilyProfile,
  getExtendedFamilyProfile,
  updateExtendedFamilyProfile,

  // Backward-compatible aliases
  getProfessionalDetails: getProfessionalProfile,
  saveProfessionalDetails: updateProfessionalProfile,
  getHoroscopeDetails: getHoroscopeProfile,
  saveHoroscopeDetails: updateHoroscopeProfile,
  getFamilyDetailsRecord: getFamilyProfile,
  saveFamilyDetailsRecord: updateFamilyProfile,
  getExtendedFamilyDetails: getExtendedFamilyProfile,
  saveExtendedFamilyDetails: updateExtendedFamilyProfile,
};
