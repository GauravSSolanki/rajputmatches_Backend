const legacyAuth = require("../authController.js");
const { wrapHandler } = require("../../utils/legacyBridge.js");

module.exports = {
  sendPhotoAccessRequest: wrapHandler(legacyAuth.sendphotoRequest),
  withdrawPhotoRequest: wrapHandler(legacyAuth.withdrawal),
  acceptPhotoRequest: wrapHandler(legacyAuth.acceptRequest),
  rejectPhotoRequest: wrapHandler(legacyAuth.rejectRequest),
  getPhotoRequests: wrapHandler(legacyAuth.getphotoRequests),
  removePhotoRequest: wrapHandler(legacyAuth.profilerequestdelete),
};
