const bcrypt = require("bcrypt");
const {
  MatrimonialUser,
  EmailVerificationToken,
  VerifiedEmail,
  Notification,
  PasswordResetToken,
} = require("../../models");
const {
  sendEmail,
  sendVerificationEmail,
} = require("../../middlewares/middleware.js");
const { generateToken, getNextMatrimonyId } = require("../../utils/utility.js");
const { ROLES } = require("../../utils/constants.js");
const { asyncHandler } = require("../../utils/asyncHandler.js");
const {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
} = require("../../utils/apiResponse.js");

const registerUser = asyncHandler(async (req, res) => {
  const input = req.validated;

  const existingUser = await MatrimonialUser.findOne({
    $or: [{ email: input.email }, { mobile: input.mobile }],
  });

  if (existingUser) {
    return sendBadRequest(res, "User already exists with this email or mobile");
  }

  const verifiedEmail = await VerifiedEmail.findOne({ email: input.email });
  if (!verifiedEmail || !verifiedEmail.isVerified) {
    return sendNotFound(
      res,
      "Email is not verified. Please verify your email before signing up."
    );
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);
  const martrId = await getNextMatrimonyId();

  const user = await MatrimonialUser.create({
    martrId,
    firstName: input.firstName,
    middleName: input.middleName || "",
    lastName: input.lastName,
    countryCode: input.countryCode,
    mobile: input.mobile,
    email: input.email,
    dateOfBirth: input.dateOfBirth,
    gender: input.gender,
    password: hashedPassword,
    profilefor: input.profilefor,
    role: ROLES.USER,
    address: {
      country: input.country,
      state: input.state,
      city: input.city,
      district: input.district || "",
      street: input.street || "",
      zipCode: input.zipCode || "",
    },
  });

  const token = generateToken(user._id);

  await Notification.create({
    userId: user._id,
    type: "registration",
    message: `New user ${user.firstName} registered successfully.`,
  });

  return sendCreated(res, "User registered successfully", { user, token });
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.validated;

  const user = await MatrimonialUser.findOne({
    $or: [{ email: username }, { mobile: username }],
  });

  if (!user) {
    return sendNotFound(res, "User not found");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return sendBadRequest(res, "Invalid credentials");
  }

  req.session.userId = user._id;
  const token = generateToken(user._id);

  await Notification.create({
    avatar: user.avatar,
    userId: user._id,
    type: "login",
    message: `User ${user.firstName} logged in successfully.`,
  });

  return sendSuccess(res, "Login successful", { token });
});

const logoutUser = asyncHandler(async (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return sendBadRequest(res, "Failed to log out");
    }

    res.clearCookie("connect.sid");
    return sendSuccess(res, "Logged out successfully");
  });
});

const sendForgotPasswordLink = asyncHandler(async (req, res) => {
  const { username } = req.validated;

  const user = await MatrimonialUser.findOne({
    $or: [{ email: username }, { mobile: username }],
  }).select("email");

  if (!user) {
    return sendNotFound(
      res,
      "User not found. Please check your email or mobile number."
    );
  }

  const emailResult = await sendEmail(user.email, user._id);
  if (!emailResult.success) {
    return sendBadRequest(
      res,
      emailResult.message || "Failed to send reset link. Please try again later."
    );
  }

  return sendSuccess(
    res,
    "Password reset link has been sent to your registered email."
  );
});

const sendEmailVerification = asyncHandler(async (req, res) => {
  const { email } = req.validated;

  const verifiedRecord = await VerifiedEmail.findOne({ email });
  if (verifiedRecord) {
    return sendSuccess(res, "Email is already verified");
  }

  const emailResult = await sendVerificationEmail(email);
  if (!emailResult || !emailResult.success) {
    return sendBadRequest(
      res,
      emailResult?.message || "Failed to send verification email"
    );
  }

  return sendSuccess(res, emailResult.message);
});

const verifyEmailToken = asyncHandler(async (req, res) => {
  const { token } = req.validated;

  const tokenRecord = await EmailVerificationToken.findOne({ token });
  if (!tokenRecord) {
    return sendBadRequest(res, "Invalid or expired token.");
  }

  const { email } = tokenRecord;
  let verifiedRecord = await VerifiedEmail.findOne({ email });

  if (verifiedRecord && verifiedRecord.isVerified) {
    return sendSuccess(res, "Email is already verified.");
  }

  if (verifiedRecord) {
    verifiedRecord.isVerified = true;
    await verifiedRecord.save();
  } else {
    await VerifiedEmail.create({ email, isVerified: true });
  }

  await EmailVerificationToken.deleteOne({ _id: tokenRecord._id });
  return sendSuccess(res, "Email successfully verified!");
});

const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { password, newPassword } = req.validated;

  const user = await MatrimonialUser.findById(userId);
  if (!user) {
    return sendNotFound(res, "User not found");
  }

  const resetToken = await PasswordResetToken.findOne({ email: user.email });
  if (!resetToken) {
    return sendBadRequest(res, "Token expired or password already changed");
  }

  const isOldPasswordValid = await bcrypt.compare(password, user.password);
  if (!isOldPasswordValid) {
    return sendBadRequest(res, "Old password is incorrect");
  }

  if (password === newPassword) {
    return sendBadRequest(
      res,
      "New password must be different from the old password"
    );
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  await PasswordResetToken.findOneAndDelete({ email: user.email });

  return sendSuccess(res, "Password reset successful");
});

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  sendForgotPasswordLink,
  sendEmailVerification,
  verifyEmailToken,
  changePassword,
};
