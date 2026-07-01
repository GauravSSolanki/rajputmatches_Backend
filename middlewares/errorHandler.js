const { sendError } = require("../utils/apiResponse.js");

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  return sendError(res, message, statusCode, error.errors || null);
}

module.exports = { errorHandler };
