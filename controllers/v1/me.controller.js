const profileDetails = require("../../services/profileDetailsService.js");
const { asyncHandler } = require("../../utils/asyncHandler.js");
const {
  sendSuccess,
  sendNotFound,
  sendFetchedOrCreated,
} = require("../../utils/apiResponse.js");

const getCurrentUserProfile = asyncHandler(async (req, res) => {
  const user = await profileDetails.getUserProfile(req.user.id);

  if (!user) {
    return sendNotFound(res, "User not found");
  }

  return sendSuccess(res, "Profile fetched", { user });
});

const updateBasicProfile = asyncHandler(async (req, res) => {
  const updatedProfile = await profileDetails.updateBasicProfile(
    req.user.id,
    req.validated.data
  );

  return sendSuccess(res, "Profile updated successfully", updatedProfile);
});

const getProfessionalDetails = asyncHandler(async (req, res) => {
  const record = await profileDetails.getProfessionalProfile(req.user.id);

  return sendFetchedOrCreated(res, record, {
    created: "Professional profile created",
    fetched: "Professional profile fetched",
  });
});

const updateProfessionalDetails = asyncHandler(async (req, res) => {
  const updatedRecord = await profileDetails.updateProfessionalProfile(
    req.user.id,
    req.validated.data
  );

  return sendSuccess(res, "Professional details updated", updatedRecord);
});

const getHoroscopeDetails = asyncHandler(async (req, res) => {
  const record = await profileDetails.getHoroscopeProfile(req.user.id);

  return sendFetchedOrCreated(res, record, {
    created: "Horoscope details created",
    fetched: "Horoscope details fetched",
  });
});

const updateHoroscopeDetails = asyncHandler(async (req, res) => {
  const updatedRecord = await profileDetails.updateHoroscopeProfile(
    req.user.id,
    req.validated.data
  );

  return sendSuccess(res, "Horoscope details updated", updatedRecord);
});

const getFamilyDetails = asyncHandler(async (req, res) => {
  const record = await profileDetails.getFamilyProfile(req.user.id);

  return sendFetchedOrCreated(res, record, {
    created: "Family details created",
    fetched: "Family details fetched",
  });
});

const updateFamilyDetails = asyncHandler(async (req, res) => {
  const updatedRecord = await profileDetails.updateFamilyProfile(
    req.user.id,
    req.validated.data
  );

  return sendSuccess(res, "Family details updated", updatedRecord);
});

const getExtendedFamilyDetails = asyncHandler(async (req, res) => {
  const record = await profileDetails.getExtendedFamilyProfile(req.user.id);

  return sendFetchedOrCreated(res, record, {
    created: "Extended family details created",
    fetched: "Extended family details fetched",
  });
});

const updateExtendedFamilyDetails = asyncHandler(async (req, res) => {
  const updatedRecord = await profileDetails.updateExtendedFamilyProfile(
    req.user.id,
    req.validated.data
  );

  return sendSuccess(res, "Extended family details updated", updatedRecord);
});

module.exports = {
  getCurrentUserProfile,
  updateBasicProfile,
  getProfessionalDetails,
  updateProfessionalDetails,
  getHoroscopeDetails,
  updateHoroscopeDetails,
  getFamilyDetails,
  updateFamilyDetails,
  getExtendedFamilyDetails,
  updateExtendedFamilyDetails,
};
