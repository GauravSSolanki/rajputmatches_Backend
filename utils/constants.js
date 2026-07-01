/**
 * App-wide constants.
 * Use these instead of hard-coded strings in controllers and middleware.
 */
const ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin",
});

const ADMIN_ROLES = Object.freeze({
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  MODERATOR: "moderator",
});

const GENDERS = Object.freeze({
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
});

const REQUEST_STATUS = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
});

const MARITAL_STATUS = Object.freeze(["Single"]);

module.exports = {
  ROLES,
  ADMIN_ROLES,
  GENDERS,
  REQUEST_STATUS,
  MARITAL_STATUS,
};
