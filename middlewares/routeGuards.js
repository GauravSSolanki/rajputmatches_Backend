const { isAuth } = require("./middleware.js");
const { requireMatrimonialUser, requireAdminUser } = require("./role.middleware.js");

/**
 * Use on routes that only logged-in matrimonial users can access.
 * Example: router.use(...protectUser);
 */
const protectUser = [isAuth, requireMatrimonialUser];

/**
 * Use on routes that only logged-in admins can access.
 * Example: router.use(...protectAdmin);
 */
const protectAdmin = [isAuth, requireAdminUser];

module.exports = {
  protectUser,
  protectAdmin,
};
