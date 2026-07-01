const {
  wrapHandler,
  wrapHandlerWithMap,
} = require("./legacyBridge");

// Keep old names so existing imports still work.
const bindLegacyHandler = wrapHandler;
const bindLegacyHandlerWithMap = wrapHandlerWithMap;

module.exports = {
  wrapHandler,
  wrapHandlerWithMap,
  bindLegacyHandler,
  bindLegacyHandlerWithMap,
};
