const legacyAuth = require("../authController.js");
const { wrapHandler, wrapHandlerWithMap } = require("../../utils/legacyBridge.js");

function setLegacyChatIdFromQuery(req) {
  req.body.chatId = req.validated?.chatId;
}

function setLegacyChatDeleteBody(req) {
  req.body.chatId = req.validated?.chatId;
  req.body.deleteForAll = req.validated?.deleteForAll;
}

function setLegacyChatStatusBody(req) {
  const status = req.validated?.status || req.validated?.action;
  req.body.data = {
    chatId: req.validated?.chatId,
    action: status,
  };
}

function setLegacyValidateChatBody(req) {
  req.body.profileId = req.validated?.profileId || req.validated?.user2;
}

module.exports = {
  sendChatMessage: wrapHandler(legacyAuth.sendMessage),
  listChatMessages: wrapHandlerWithMap(
    legacyAuth.getMessages,
    setLegacyChatIdFromQuery
  ),
  clearChatMessages: wrapHandlerWithMap(
    legacyAuth.deleteMessage,
    setLegacyChatDeleteBody
  ),
  createOrResumeChat: wrapHandler(legacyAuth.createOrGetChat),
  listUserChats: wrapHandler(legacyAuth.getUserChats),
  listPendingChats: wrapHandler(legacyAuth.getallchatsRequest),
  updateChatRequestStatus: wrapHandlerWithMap(
    legacyAuth.updateChatStatus,
    setLegacyChatStatusBody
  ),
  validateChatParticipants: wrapHandlerWithMap(
    legacyAuth.chatValidator,
    setLegacyValidateChatBody
  ),
};
