const { asyncHandler } = require("./asyncHandler");

/**
 * Wrap an old controller function so async errors go to the error handler.
 */
function wrapHandler(handler) {
  return asyncHandler((req, res, next) => handler(req, res, next));
}

/**
 * Wrap an old controller and run a small mapper first.
 * Useful when the new route shape is different from the old one.
 */
function wrapHandlerWithMap(handler, mapRequest) {
  return asyncHandler((req, res, next) => {
    mapRequest(req);
    return handler(req, res, next);
  });
}

/**
 * Old handlers read profile id from req.params.id
 */
function setLegacyProfileParamId(req) {
  const profileId = req.validated?.profileId || req.params?.profileId;
  if (profileId) {
    req.params.id = profileId;
  }
}

/**
 * Old handlers read profile id from req.body.data
 */
function setLegacyProfileBodyData(req) {
  const profileId = req.validated?.profileId || req.params?.profileId;
  if (profileId) {
    req.body.data = profileId;
  }
}

/**
 * Old summary handler reads profile id from req.body.profileId
 */
function setLegacyProfileBodyProfileId(req) {
  const profileId = req.validated?.profileId;
  if (profileId) {
    req.body.profileId = profileId;
  }
}

module.exports = {
  wrapHandler,
  wrapHandlerWithMap,
  setLegacyProfileParamId,
  setLegacyProfileBodyData,
  setLegacyProfileBodyProfileId,
};
