// Backward-compatible re-exports. Use ProfileVisit for new code.
const ProfileVisit = require("./ProfileVisit");

module.exports = {
  ProfileVisit,
  ProfileView: ProfileVisit,
  VisitedProfile: ProfileVisit,
};
