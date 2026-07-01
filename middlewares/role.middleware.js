const { MatrimonialUser, Admin } = require("../models");
const { ROLES, GENDERS } = require("../utils/constants.js");
const { sendForbidden, sendNotFound } = require("../utils/apiResponse.js");

async function loadMatrimonialUser(req) {
  if (req.matrimonialUser) {
    return req.matrimonialUser;
  }

  const user = await MatrimonialUser.findById(req.user.id).select("role gender isEnable");
  req.matrimonialUser = user;
  return user;
}

async function requireMatrimonialUser(req, res, next) {
  try {
    const user = await loadMatrimonialUser(req);

    if (!user) {
      return sendNotFound(res, "User not found");
    }

    if (user.role !== ROLES.USER) {
      return sendForbidden(res, "Matrimonial user access required");
    }

    if (user.isEnable === false) {
      return sendForbidden(res, "Account is disabled");
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

async function requireAdminUser(req, res, next) {
  try {
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return sendNotFound(res, "Admin not found");
    }

    if (!admin.isActive) {
      return sendForbidden(res, "Admin account is inactive");
    }

    req.adminUser = admin;
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireGender(...allowedGenders) {
  return async function genderMiddleware(req, res, next) {
    try {
      const user = await loadMatrimonialUser(req);

      if (!user) {
        return sendNotFound(res, "User not found");
      }

      if (!allowedGenders.includes(user.gender)) {
        const allowedList = allowedGenders.join(" or ");
        return sendForbidden(
          res,
          `This action is only available for ${allowedList} users`
        );
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

const requireMaleUser = requireGender(GENDERS.MALE);
const requireFemaleUser = requireGender(GENDERS.FEMALE);

module.exports = {
  requireMatrimonialUser,
  requireAdminUser,
  requireGender,
  requireMaleUser,
  requireFemaleUser,
  loadMatrimonialUser,
};
