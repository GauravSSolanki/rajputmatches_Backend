const legacyAuth = require("../authController.js");
const { wrapHandler, wrapHandlerWithMap } = require("../../utils/legacyBridge.js");

module.exports = {
  getPublicPage: wrapHandlerWithMap(legacyAuth.ShareTermsAndPolicy, (req) => {
    req.params.slug = req.validated.slug;
  }),
  submitContactForm: wrapHandler(legacyAuth.createContactRequest),
};
