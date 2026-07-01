/**
 * Zod validation middleware.
 *
 * After validation passes, safe data is stored on req.validated.
 * Controllers should read req.validated instead of req.body directly.
 */
function validate(schema, source = "body") {
  return function validationMiddleware(req, res, next) {
    const input = req[source];
    const result = schema.safeParse(input);

    if (!result.success) {
      const errors = result.error.flatten();
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.fieldErrors,
        formErrors: errors.formErrors,
      });
    }

    if (source === "body") {
      req.validated = result.data;
    } else {
      req.validated = {
        ...(req.validated || {}),
        ...result.data,
      };
    }

    next();
  };
}

module.exports = { validate };
