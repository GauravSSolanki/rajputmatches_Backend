const legacyAuth = require("../authController.js");
const { wrapHandler } = require("../../utils/legacyBridge.js");

module.exports = {
  sendConnectionRequest: wrapHandler(legacyAuth.sendRequest),
  withdrawConnectionRequest: wrapHandler(legacyAuth.reqwithdrawal),
  acceptConnectionRequest: wrapHandler(legacyAuth.reqacceptRequest),
  rejectConnectionRequest: wrapHandler(legacyAuth.reqrejectRequest),
  getConnectionRequests: wrapHandler(legacyAuth.getRequests),
  removeSentConnectionRequest: wrapHandler(legacyAuth.profiledelete),
  removeReceivedConnectionRequest: wrapHandler(legacyAuth.Removerequest),
};
