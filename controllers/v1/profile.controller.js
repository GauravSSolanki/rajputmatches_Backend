const legacyAuth = require("../authController.js");
const {
  wrapHandler,
  wrapHandlerWithMap,
  setLegacyProfileParamId,
  setLegacyProfileBodyData,
  setLegacyProfileBodyProfileId,
} = require("../../utils/legacyBridge.js");

module.exports = {
  searchProfiles: wrapHandlerWithMap(legacyAuth.getprofiles, (req) => {
    if (req.validated?.data) {
      req.body.data = req.validated.data;
    }
  }),

  getProfileDetails: wrapHandlerWithMap(
    legacyAuth.viewDetails,
    setLegacyProfileParamId
  ),
  getProfilePhotos: wrapHandlerWithMap(
    legacyAuth.viewPhotos,
    setLegacyProfileParamId
  ),
  getProfileSummary: wrapHandlerWithMap(
    legacyAuth.viewProfileById,
    setLegacyProfileBodyProfileId
  ),

  recordProfileView: wrapHandlerWithMap(
    legacyAuth.addProfileView,
    setLegacyProfileBodyData
  ),
  addProfileToShortlist: wrapHandlerWithMap(
    legacyAuth.shortlist,
    setLegacyProfileBodyData
  ),
  removeProfileFromShortlist: wrapHandlerWithMap(
    legacyAuth.deleteShortlistedProfile,
    setLegacyProfileBodyData
  ),
  toggleShortlistBookmark: wrapHandlerWithMap(
    legacyAuth.profilebookmark,
    setLegacyProfileBodyData
  ),

  getShortlistedProfiles: wrapHandler(legacyAuth.getshortlistedData),
  getVisitedProfiles: wrapHandler(legacyAuth.getviewedData),
  getProfileVisitors: wrapHandler(legacyAuth.getvisitedData),
};
