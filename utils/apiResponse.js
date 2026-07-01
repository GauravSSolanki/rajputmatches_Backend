/**
 * Standard API response helpers.
 * Every response uses: { success, message, data? }
 */

function sendSuccess(res, message, data = null, statusCode = 200) {
  const body = { success: true, message };

  if (data !== null && data !== undefined) {
    body.data = data;
  }

  return res.status(statusCode).json(body);
}

function sendError(res, message, statusCode = 500, errors = null) {
  const body = { success: false, message };

  if (errors) {
    body.errors = errors;
  }

  return res.status(statusCode).json(body);
}

function sendCreated(res, message, data) {
  return sendSuccess(res, message, data, 201);
}

function sendNotFound(res, message = "Resource not found") {
  return sendError(res, message, 404);
}

function sendForbidden(res, message = "Access denied") {
  return sendError(res, message, 403);
}

function sendBadRequest(res, message, errors = null) {
  return sendError(res, message, 400, errors);
}

/**
 * Used when a GET may create an empty record the first time.
 */
function sendFetchedOrCreated(res, record, labels) {
  if (record.created) {
    return sendCreated(res, labels.created, record.doc);
  }

  return sendSuccess(res, labels.fetched, record.doc);
}

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendNotFound,
  sendForbidden,
  sendBadRequest,
  sendFetchedOrCreated,
};
