const {
  MatrimonialUser: User,
  HoroscopeProfile: HoroscopeDetails,
  FamilyProfile: FamilyDetails,
  ProfessionalProfile: ProfessionalDetails,
  ExtendedFamilyProfile: ExtendedFamily,
  PhotoAccessRequest: PhotoRequest,
  ConnectionRequest: ProfileConnectionRequest,
  Shortlist,
  Notification,
  SubscriptionLimit: Limit,
  CmsPage: Page,
  MediaAlbum: files,
  Story: Stories,
  VerifiedEmail,
  ContactRequest,
  EmailVerificationToken,
  ChatMessage: Message,
  Chat,
  PasswordResetToken: Tokenschema,
} = require("../models");
const { ProfileView, VisitedProfile } = require("../models/profileView.js");
const profileInteraction = require("../services/profileInteractionService.js");
const profileDetails = require("../services/profileDetailsService.js");
const {
  getAcceptedPhotoOwnerIdsForRequester,
  hasAcceptedPhotoAccess,
  hasAcceptedConnection,
  hasActiveConnection,
  enrichProfileForViewer,
  filterFilesForViewer,
  isProfileLocked,
  applyLockedProfileVisibility,
} = require("../utils/profileAccess.js");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const {
  sendEmail,
  sendNotificationToAdmin,
  sendVerificationEmail,
} = require("../middlewares/middleware.js");

const { generateToken, getNextMatrimonyId } = require("../utils/utility.js");
const express = require("express");
const mongoose = require("mongoose");

exports.signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      mobile,
      email,
      dateOfBirth,
      gender,
      profilefor,
      password,
      countryCode,
    } = req.body;

    if (!firstName || !email || !mobile || !password || !countryCode) {
      return res
        .status(400)
        .json({ message: "All fields are required", success: false });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "Invalid email format", success: false });
    }

    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobile)) {
      return res
        .status(400)
        .json({ message: "Invalid mobile number format", success: false });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email }, { mobile: mobile }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email or mobile",
        success: false,
      });
    }

    const verifiedEmail = await VerifiedEmail.findOne({ email });

    if (!verifiedEmail || !verifiedEmail.isVerified) {
      return res.status(404).json({
        message:
          "Email is not verified. Please verify your email before signing up.",
        success: false,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const matrimoniId = await getNextMatrimonyId();

    const user = await User.create({
      martrId: matrimoniId,
      firstName,
      middleName: req.body.middleName || "",
      lastName,
      countryCode,
      mobile,
      email,
      dateOfBirth,
      gender,
      password: hashedPassword,
      profilefor,
      address: {
        country: req.body.country,
        state: req.body.state,
        city: req.body.city,
        district: req.body.district || "",
        street: req.body.street || "",
        zipCode: req.body.zipCode || "",
      },
    });

    const token = generateToken(user._id);

    await Notification.create({
      userId: user._id,
      type: "registration",
      message: `New User ${user.firstName} have successfully registered.`,
    });

    res.status(201).json({
      message: "User registered successfully",
      user,
      token,
      success: true,
    });
  } catch (error) {
    console.log("Error during signup:", error);
    res.status(500).json({
      message: "Server error. Please try again later.",
      success: false,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("login");
    console.log(username);
    console.log(password);

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    const user = await User.findOne({
      $or: [{ email: username }, { mobile: username }],
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    req.session.userId = user._id;
    const token = generateToken(user._id);

    await Notification.create({
      avatar: user.avatar,
      userId: user._id,
      type: "login",
      message: `User ${user.firstName} have successfully logged in.`,
    });

    console.log(token);
    res.status(200).json({ message: "Login successful", token: token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({
      $or: [{ email: username }, { mobile: username }],
    }).select("email mobile");

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please check your email or mobile number.",
      });
    }

    let resp = await sendEmail(user.email, user._id);

    if (!resp.success) {
      return res.status(400).json({
        message:
          resp.message || "Failed to send reset link. Please try again later.",
      });
    }

    res.status(200).json({
      message: "Password reset link has been sent to your registered email.",
    });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};
exports.sendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Email is required", success: false });
    }

    let isMatched = await VerifiedEmail.findOne({ email });

    if (isMatched) {
      return res
        .status(200)
        .json({ message: "Email is already Verified", success: true });
    }

    let resp = await sendVerificationEmail(email);
    if (!resp?.success) {
      return res.status(500).json({
        message: resp.message,
        success: false,
      });
    }

    res.status(200).json({
      message: resp.message,
      success: true,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", success: false, error });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "Token is required." });
    }

    // Find the token in the database using findOne()
    console.log(token);
    const tokenRecord = await EmailVerificationToken.findOne({ token });
    console.log(tokenRecord);

    if (!tokenRecord) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token." });
    }

    // Access the email field from the tokenRecord
    const email = tokenRecord.email;

    // Check if email already exists in VerifiedEmail collection
    let existingRecord = await VerifiedEmail.findOne({ email });

    if (existingRecord) {
      if (existingRecord?.isVerified) {
        return res
          .status(200)
          .json({ success: true, message: "Email is already verified." });
      }
      existingRecord.isVerified = true;
      await existingRecord.save();
    } else {
      await VerifiedEmail.create({ email, isVerified: true });
    }

    // Remove the token after successful verification
    await EmailVerificationToken.deleteOne({ _id: tokenRecord._id });

    res
      .status(200)
      .json({ success: true, message: "Email successfully verified!" });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const tokenEntry = await Tokenschema.findOne({ email: user.email });
    if (!tokenEntry) {
      return res.status(400).json({
        success: false,
        message: "Token expired or password already changed",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    if (password === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the old password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    await Tokenschema.findOneAndDelete({ email: user.email });

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Error during password reset:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error,
    });
  }
};


exports.getshortlistedData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("_id").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const shortlistData = await profileInteraction.formatShortlistResponse(
      userId
    );

    return res.status(200).json({
      message: "Shortlisted profiles fetched successfully.",
      user: { _id: user._id, ...shortlistData },
    });
  } catch (error) {
    console.error("Error fetching shortlisted data:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getviewedData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("_id").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const visitedIds = await profileInteraction.getVisitedProfileIds(userId);
    const visitedAt = await profileInteraction.populateProfilesForViewer(
      visitedIds,
      userId
    );

    return res.status(200).json({ user: { _id: user._id, visitedAt } });
  } catch (error) {
    console.error("Error fetching viewed data:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getvisitedData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("_id").lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const visitorIds = await profileInteraction.getVisitorProfileIds(userId);
    const viewedBy = await profileInteraction.populateProfilesForViewer(
      visitorIds,
      userId
    );

    return res.status(200).json({ user: { _id: user._id, viewedBy } });
  } catch (error) {
    console.error("Error fetching viewed data:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteShortlistedProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    const deleted = await profileInteraction.removeFromShortlist(
      userId,
      profileId
    );

    if (!deleted) {
      return res
        .status(404)
        .json({ message: "Profile not found in the shortlist" });
    }

    const user = await User.findById(userId);
    res
      .status(200)
      .json({ message: "Profile removed from shortlist successfully", user });
  } catch (error) {
    console.error("Error while removing profile from shortlist:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.profilebookmark = async (req, res) => {
  try {
    const userId = req.user?.id;
    const profileId = req.body?.data;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User ID missing" });
    }

    if (!profileId) {
      return res
        .status(400)
        .json({ message: "Bad request: Profile ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const entry = await profileInteraction.toggleShortlistBookmark(
      userId,
      profileId
    );

    return res.status(200).json({
      message: "Bookmark status updated successfully",
      isbookmarked: entry.isbookmarked,
      user,
    });
  } catch (error) {
    console.error("Error updating bookmark status:", error);

    if (error.name === "CastError") {
      return res.status(400).json({ message: "Invalid profile ID format" });
    }
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "Validation error", details: error.errors });
    }

    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

exports.sendRequest = async (req, res) => {
  const userId = req.user.id;
  const profileId = req.body.data;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const limit = await Limit.findOne();
    if (!limit) {
      return res.status(500).json({ message: "Limit configuration not found" });
    }

    if (user.reqSentCount >= limit.freeProfileViews && !user.isSubscribed) {
      return res.status(403).json({ message: "Free request limit exceeded" });
    }

    const existing = await ProfileConnectionRequest.findOne({
      requesterId: userId,
      receiverId: profileId,
    });

    if (!existing) {
      await profileInteraction.createConnectionRequest(userId, profileId);
      user.reqSentCount++;
      await user.save();
    }

    return res.status(200).json({ message: "Request sent successfully" });
  } catch (error) {
    console.error("Error sending request:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.sendphotoRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    const profileId = req.body?.data;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required." });
    }

    if (userId === profileId) {
      return res
        .status(400)
        .json({ message: "You cannot send a request to yourself." });
    }

    const user = await User.findById(userId).populate("filesId", "isPrivate photos");
    const profile = await User.findById(profileId).populate(
      "filesId",
      "isPrivate photos"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    if (!profile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    if (!profile.filesId || !profile.filesId._id) {
      return res
        .status(400)
        .json({ message: "The selected user has no photos available." });
    }

    await profileInteraction.createPhotoRequest(userId, profileId);

    return res.status(200).json({ message: "Request sent successfully." });
  } catch (error) {
    console.error("Error sending request:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.withdrawal = async (req, res) => {
  const userId = req.user.id;
  const profileId = req.body.data;

  if (!profileId) {
    return res.status(400).json({ message: "Profile ID is required" });
  }

  try {
    const deleted = await profileInteraction.deletePhotoRequest(
      userId,
      profileId
    );

    if (!deleted) {
      return res.status(404).json({ message: "Photo request not found" });
    }

    return res.status(200).json({ message: "Request withdrawn successfully" });
  } catch (error) {
    console.error("Error withdrawing request:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.acceptRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const request = await PhotoRequest.findOne({
      requesterId: profileId,
      ownerId: userId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Photo request not found" });
    }

    await profileInteraction.updatePhotoRequestStatus(
      userId,
      profileId,
      "accepted"
    );

    return res.status(200).json({ message: "Request accepted successfully" });
  } catch (error) {
    console.error("Error accepting request:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const request = await PhotoRequest.findOne({
      requesterId: profileId,
      ownerId: userId,
    });

    if (!request) {
      return res.status(404).json({ message: "Photo request not found" });
    }

    await profileInteraction.updatePhotoRequestStatus(
      userId,
      profileId,
      "rejected"
    );

    return res.status(200).json({ message: "Request rejected successfully" });
  } catch (error) {
    console.error("Error rejecting request:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.reqwithdrawal = async (req, res) => {
  const userId = req.user.id;
  const profileId = req.body.data;

  if (!profileId) {
    return res.status(400).json({ message: "Profile ID is required" });
  }

  try {
    const deleted = await profileInteraction.deleteConnectionRequest(
      userId,
      profileId
    );

    if (!deleted) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    return res.status(200).json({ message: "Request withdrawn successfully" });
  } catch (error) {
    console.error("Error withdrawing request:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.reqacceptRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const request = await ProfileConnectionRequest.findOne({
      requesterId: profileId,
      receiverId: userId,
      status: "pending",
    });

    if (!request) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    await profileInteraction.updateConnectionRequestStatus(
      userId,
      profileId,
      "accepted"
    );

    return res.status(200).json({ message: "Request accepted successfully" });
  } catch (error) {
    console.error("Error accepting request:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.reqrejectRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const request = await ProfileConnectionRequest.findOne({
      requesterId: profileId,
      receiverId: userId,
    });

    if (!request) {
      return res.status(404).json({ message: "Connection request not found" });
    }

    await profileInteraction.updateConnectionRequestStatus(
      userId,
      profileId,
      "rejected"
    );

    return res.status(200).json({ message: "Request rejected successfully" });
  } catch (error) {
    console.error("Error rejecting request:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getphotoRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId).select("_id").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const photoRequests = await profileInteraction.formatPhotoRequestsResponse(
      userId
    );

    return res.status(200).json({ user: { _id: user._id, ...photoRequests } });
  } catch (error) {
    console.error("Error fetching photo requests:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId).select("_id").lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const connectionRequests =
      await profileInteraction.formatConnectionRequestsResponse(userId);

    return res
      .status(200)
      .json({ user: { _id: user._id, ...connectionRequests } });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.viewProfileById = async (req, res) => {
  const userId = req.user.id;
  const profileId = req.body.profileId;

  try {
    const [photoAccess, connectionAccess, profile] = await Promise.all([
      hasAcceptedPhotoAccess(userId, profileId),
      hasAcceptedConnection(userId, profileId),
      User.findById(profileId)
        .select(
          "firstName lastName height gender dateOfBirth martrId HoroscopicId filesId profdetailsId address familydetailsId isVisible"
        )
        .populate(profileInteraction.PROFILE_POPULATE),
    ]);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    let profileData = profile.toObject();

    if (isProfileLocked(profileData) && !connectionAccess) {
      profileData = applyLockedProfileVisibility(profileData, false);
    } else {
      profileData.filesId = filterFilesForViewer(
        profileData.filesId,
        photoAccess || !profileData.filesId?.isPrivate
      );
    }

    const paternalDetailsData = connectionAccess
      ? await ExtendedFamily.find({ userId: profile._id })
      : [];

    const paternaldetails = paternalDetailsData.map(
      ({ createdAt, updatedAt, _id, userId: _uid, ...filteredData }) =>
        filteredData
    );

    return res.status(200).json({
      profile: { ...profileData, paternaldetails },
    });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.addProfileView = async (req, res) => {
  const userId = req.user.id;
  const profileId = req.body.data;

  try {
    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    if (userId === profileId) {
      return res.status(400).json({ message: "Cannot record self view" });
    }

    await profileInteraction.recordProfileVisit(userId, profileId);

    return res.status(200).json({ message: "View recorded successfully" });
  } catch (error) {
    console.error("Error recording view:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getuserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await profileDetails.getUserProfile(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found", success: false });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", success: false, error });
  }
};
exports.shortlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existing = await Shortlist.findOne({ userId, profileId });
    if (existing) {
      return res
        .status(200)
        .json({ message: "Profile already shortlisted", user });
    }

    await profileInteraction.addToShortlist(userId, profileId);
    res.status(200).json({ message: "Profile shortlisted successfully", user });
  } catch (error) {
    console.error("Error while shortlisting profile:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.profiledelete = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await profileInteraction.deleteConnectionRequest(userId, profileId);

    res.status(200).json({ message: "Profile deleted successfully", user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.profilerequestdelete = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await profileInteraction.deletePhotoRequest(userId, profileId);

    res.status(200).json({ message: "Profile deleted successfully", user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.Removerequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await profileInteraction.deleteConnectionRequest(profileId, userId);

    res.status(200).json({ message: "Profile deleted successfully", user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.getprofiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      minAge,
      maxAge,
      gender,
      occupation,
      class: userClass,
      HeightFeetfrom,
      HeightFeetto,
      maritalStatus,
    } = req.body?.data ?? {};

    console.log(req.body.data);

    const user = await User.findById(userId)
      .select("gender isSubscribed")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    const acceptedPhotoOwnerIds =
      await getAcceptedPhotoOwnerIdsForRequester(userId);

    const query = {
      isVisible: true,
      isbloacked: false,
      gender: gender || (user.gender === "Male" ? "Female" : "Male"),
      _id: { $ne: userId },
    };

    if (minAge || maxAge) {
      query.dateOfBirth = {};
      if (minAge)
        query.dateOfBirth.$lte = new Date(
          new Date().setFullYear(new Date().getFullYear() - minAge)
        );
      if (maxAge)
        query.dateOfBirth.$gte = new Date(
          new Date().setFullYear(new Date().getFullYear() - maxAge)
        );
    }

    if (name) {
      if (!isNaN(name)) {
        query.martrId = parseInt(name, 10);
      } else {
        const regex = new RegExp(name, "i");
        query.$expr = {
          $regexMatch: {
            input: {
              $trim: {
                input: {
                  $concat: [
                    "$firstName",
                    " ",
                    {
                      $cond: {
                        if: { $eq: ["$middleName", ""] },
                        then: "",
                        else: "$middleName",
                      },
                    },
                    " ",
                    "$lastName",
                  ],
                },
              },
            },
            regex: regex,
          },
        };
      }
    }

    if (HeightFeetfrom || HeightFeetto) {
      query["height.feet"] = {};
      if (HeightFeetfrom)
        query["height.feet"].$gte = parseInt(HeightFeetfrom, 10);
      if (HeightFeetto) query["height.feet"].$lte = parseInt(HeightFeetto, 10);
    }

    if (maritalStatus) query.maritalStatus = maritalStatus;

    const profileLimitDoc = await Limit.findOne().select("freeProfileViews");
    const profileLimit = user.isSubscribed ? 50 : 10;

    let profiles = await User.find(query)
      .limit(profileLimit)
      .populate("filesId")
      .populate("HoroscopicId")
      .populate({ path: "familydetailsId", select: "occupation" })
      .populate({ path: "profdetailsId", select: "class" })
      .lean();

    console.log(profiles);

    if (occupation) {
      profiles = profiles.filter(
        (profile) =>
          profile.familydetailsId &&
          profile.familydetailsId.occupation &&
          profile.familydetailsId.occupation
            .toLowerCase()
            .includes(occupation.toLowerCase())
      );
    }

    if (userClass) {
      profiles = profiles.filter(
        (profile) =>
          profile.profdetailsId &&
          profile.profdetailsId.class &&
          profile.profdetailsId.class
            .toLowerCase()
            .includes(userClass.toLowerCase())
      );
    }

    const filterProfiles = profiles.map((profile) => {
      const photoAccess = acceptedPhotoOwnerIds.has(profile._id.toString());

      if (profile.filesId && profile.filesId.photos) {
        const filesId = filterFilesForViewer(profile.filesId, photoAccess, {
          avatarOnly: true,
        });
        return {
          ...profile,
          filesId: {
            totalPhotos: filesId.totalPhotos,
            photos: filesId.photos,
          },
        };
      }
      return profile;
    });

    res.status(200).json({
      message: "Profiles fetched successfully.",
      data: filterProfiles,
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getprofessionaldata = async (req, res) => {
  try {
    const userId = req.user.id;
    const { doc, created } = await profileDetails.getProfessionalDetails(userId);

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Professional profile created" : "Professional profile fetched",
      user: doc,
    });
  } catch (error) {
    console.error("Error fetching professional data:", error);
    res.status(500).json({ message: "Server error", success: false, error });
  }
};

exports.saveprofessionaldata = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.validated?.data ?? req.body.data;

    const updatedProfile = await profileDetails.saveProfessionalDetails(
      userId,
      updateData
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating professional profile:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "An error occurred while updating the profile.",
    });
  }
};

exports.updateBasicdetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.validated?.data ?? req.body.data;

    const updatedProfile = await profileDetails.updateBasicProfile(
      userId,
      updateData
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "An error occurred while updating the profile.",
    });
  }
};

exports.saveRiligionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { doc, created } = await profileDetails.getHoroscopeDetails(userId);

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Religion details created" : "Religion details fetched",
      user: doc,
    });
  } catch (error) {
    console.error("Error fetching religion details:", error);
    res.status(500).json({ message: "Server error", success: false, error });
  }
};

exports.updateRiligionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.validated?.data ?? req.body.data;

    const updatedProfile = await profileDetails.saveHoroscopeDetails(
      userId,
      updateData
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating religion details:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "An error occurred while updating the profile.",
    });
  }
};

exports.saveFamilyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { doc, created } = await profileDetails.getFamilyDetailsRecord(userId);

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Family details created" : "Family details fetched",
      user: doc,
    });
  } catch (error) {
    console.error("Error fetching family details:", error);
    res.status(500).json({ message: "Server error", success: false, error });
  }
};

exports.updateFamilyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.validated?.data ?? req.body.data;

    const updatedProfile = await profileDetails.saveFamilyDetailsRecord(
      userId,
      updateData
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating family details:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "An error occurred while updating the profile.",
    });
  }
};

exports.saveExtendedFamilyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { doc, created } = await profileDetails.getExtendedFamilyDetails(userId);

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created
        ? "Extended family details created"
        : "Extended family details fetched",
      user: doc,
    });
  } catch (error) {
    console.error("Error fetching extended family details:", error);
    res.status(500).json({ message: "Server error", success: false, error });
  }
};

exports.updateExtendedFamilyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.validated?.data ?? req.body.data;

    const updatedProfile = await profileDetails.saveExtendedFamilyDetails(
      userId,
      updateData
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating extended family details:", error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "An error occurred while updating the profile.",
    });
  }
};

exports.uploadPhotos = async (req, res) => {
  try {
    const token = req.headers.token;
    if (!token)
      return res.status(401).json({ message: "Authorization token required" });

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id)
      return res.status(401).json({ message: "Invalid token" });

    const userId = decoded.id;
    const { photos, documents, isPrivate } = req.body;

    if (!Array.isArray(photos) || !Array.isArray(documents)) {
      return res
        .status(400)
        .json({ message: "Photos and documents must be arrays" });
    }

    // Check if photos exceed the maximum limit of 10
    if (photos.length > 10) {
      return res.status(400).json({ message: "Maximum of 10 photos allowed" });
    }

    const photoDocument = await Photo.findOne({ userId });

    if (photoDocument) {
      // Update existing photo and document entries
      photoDocument.photos = photos;
      photoDocument.documents = documents;
      photoDocument.isPrivate = isPrivate || photoDocument.isPrivate;

      await photoDocument.save();
      return res.status(200).json({
        message: "Photos and documents updated successfully",
        photoDocument,
      });
    } else {
      // Create a new photo document entry
      const newPhotoDocument = new Photo({
        userId,
        photos,
        documents,
        isPrivate,
      });

      await newPhotoDocument.save();
      return res.status(201).json({
        message: "Photos and documents uploaded successfully",
        newPhotoDocument,
      });
    }
  } catch (error) {
    console.error("Error uploading photos:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.createStory = async (req, res) => {
  try {
    const { title, description } = req.body;
    console.log(req.body);
    console.log(req.file);
    // Validate input
    if (!title || !description) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const newStory = new Stories({
      title,
      image: req.file,
      description,
    });

    await newStory.save();

    res.status(201).json({
      message: "Story created successfully",
      story: newStory,
    });
  } catch (error) {
    console.error("Error creating story:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.createContactRequest = async (req, res) => {
  try {
    const { firstName, lastName, mobile, email, additionalInfo, countryCode } =
      req.body.data;

    // Create a new contact request
    const newContactRequest = new ContactRequest({
      firstName,
      lastName,
      mobile,
      email,
      additionalInfo,
      countryCode,
    });

    // Save the contact request to the database
    await newContactRequest.save();

    return res.status(201).json({
      message: "Data saved successfully",
      contactRequest: newContactRequest,
    });
  } catch (error) {
    console.error("Error creating contact request:", error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        message: `A record with the same ${duplicateField} already exists.`,
      });
    }

    // Generic server error
    res.status(500).json({ message: "Server error", error });
  }
};

exports.updateimageprivacy = async (req, res) => {
  try {
    const userId = req.user.id;
    const isPrivate = req.body.data;

    console.log(isPrivate);

    const user = await files.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.isPrivate = isPrivate;
    await user.save();

    res.status(200).json({
      message: "Privacy setting updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error updating image privacy:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//chat app api's

exports.sendMessage = async (req, res) => {
  try {
    const { chatId, message } = req.body;
    console.log(req.body);
    const sender = req.user.id;

    if (!chatId || !sender || !message) {
      return res
        .status(400)
        .json({ error: "Chat ID, sender, and message are required." });
    }

    let chat = await Chat.findById(chatId).populate("lastMessage");

    if (!chat) {
      return res.status(404).json({ error: "Chat not found." });
    }

    // If the chat was declined by user2, block sending messages
    if (chat && chat.status == "rejected") {
      return res
        .status(200)
        .json({ message: "This chat has been declined and cannot be used." });
    }

    if (chat && chat.status === "other") {
      return res.status(200).json({ message: "This chat has to be Accepted." });
    }

    if (
      chat.lastMessage &&
      chat.lastMessage.sender.toString() === sender.toString()
    ) {
      return res
        .status(200)
        .json({ message: "Wait for a response before sending again." });
    }

    // Create new message
    const newMessage = new Message({
      chatId,
      sender,
      message,
      seenBy: [sender],
    });

    await newMessage.save();

    // Update chat with the new lastMessage
    chat.lastMessage = newMessage._id;
    chat.updatedAt = Date.now();
    await chat.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "firstName lastName")
      .lean();

    return res.status(201).json({ populatedMessage });
  } catch (err) {
    console.error("Error in sendMessage:", err);
    return res
      .status(500)
      .json({ error: "Server error. Please try again later." });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user.id;

    if (!chatId) {
      return res.status(400).json({ error: "Chat ID is required." });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found." });
    }

    const clearedEntry = chat.clearedBy.find(
      (entry) => entry.user.toString() === userId
    );
    const clearedAt = clearedEntry ? clearedEntry.clearedAt : null;

    let messageQuery = { chatId };
    if (clearedAt) {
      messageQuery.createdAt = { $gt: clearedAt };
    }

    const messages = await Message.find(messageQuery)
      .populate("sender")
      .sort({ createdAt: 1 })
      .lean();

    if (!messages.length) {
      return res
        .status(404)
        .json({ error: "No messages found for this chat." });
    }

    await Message.updateMany(
      { chatId, seenBy: { $ne: userId } },
      { $addToSet: { seenBy: userId } }
    );

    res.status(200).json(messages);
  } catch (err) {
    console.error("Error in getMessages:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

// exports.deleteMessage = async (req, res) => {
//   try {
//     const { chatId, deleteForAll } = req.body;
//     const userId = req.user.id;

//     if (!chatId) {
//       return res.status(400).json({ error: "Chat ID is required." });
//     }

//     const chat = await Chat.findById(chatId);
//     if (!chat) {
//       return res.status(404).json({ error: "Chat not found." });
//     }

//     if (!chat.participants.includes(userId)) {
//       return res
//         .status(403)
//         .json({ error: "You are not a participant in this chat." });
//     }

//     if (deleteForAll) {
//       await Message.deleteMany({ chatId, _id: { $ne: lastMessage } });
//       await chat.save();

//       return res.status(200).json({ message: "Chat deleted for everyone." });
//     } else {
//       const clearedAt = new Date();
//       const clearedIndex = chat.clearedBy.findIndex(
//         (entry) => entry.user.toString() === userId
//       );

//       if (clearedIndex !== -1) {
//         chat.clearedBy[clearedIndex].clearedAt = clearedAt;
//       } else {
//         chat.clearedBy.push({ user: userId, clearedAt });
//       }

//       await chat.save();

//       return res.status(200).json({ message: "Chat deleted successfully." });
//     }
//   } catch (err) {
//     console.error("Error in deleteMessage:", err);
//     res.status(500).json({ error: "Server error. Please try again later." });
//   }
// };

exports.deleteMessage = async (req, res) => {
  try {
    const { chatId, deleteForAll } = req.body;
    const userId = req.user.id;

    if (!chatId) {
      return res.status(400).json({ error: "Chat ID is required." });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: "Chat not found." });
    }

    if (!chat.participants.includes(userId)) {
      return res
        .status(403)
        .json({ error: "You are not a participant in this chat." });
    }

    if (deleteForAll) {
      const clearedAt = new Date();
      chat.clearedBy.forEach((entry) => {
        entry.clearedAt = clearedAt;
      });
      await chat.save();

      return res.status(200).json({ message: "Chat cleared for everyone." });
    } else {
      const clearedAt = new Date();
      const clearedIndex = chat.clearedBy.findIndex(
        (entry) => entry.user.toString() === userId
      );

      if (clearedIndex !== -1) {
        chat.clearedBy[clearedIndex].clearedAt = clearedAt;
      } else {
        chat.clearedBy.push({ user: userId, clearedAt });
      }

      await chat.save();

      return res.status(200).json({ message: "Chat cleared successfully." });
    }
  } catch (err) {
    console.error("Error in deleteMessage:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

exports.createOrGetChat = async (req, res) => {
  try {
    const user1 = req.user.id;
    const { user2, message } = req.body.data;

    if (!user1 || !user2) {
      return res
        .status(400)
        .json({ message: "Both user1 and user2 IDs are required." });
    }

    const userExists1 = await User.findById(user1);
    const userExists2 = await User.findById(user2);

    if (!userExists1 || !userExists2) {
      return res.status(404).json({ message: "One or both users not found." });
    }

    const hasConnection = await hasActiveConnection(user1, user2);

    if (!hasConnection) {
      return res
        .status(403)
        .json({ message: "You cannot start a chat with this user." });
    }

    let chat = await Chat.findOne({
      participants: { $all: [user1, user2] },
    }).populate("participants lastMessage");

    // If the chat exists and was declined by user2, block messages
    if (chat && chat.status === "rejected") {
      return res
        .status(403)
        .json({ error: "This chat has been declined and cannot be used." });
    }

    if (chat && chat.status === "other") {
      return res.status(200).json({ error: "This chat has to be Accepted." });
    }

    // If chat doesn't exist OR has no lastMessage, create a new chat and first message
    if (!chat || !chat.lastMessage) {
      chat = new Chat({ participants: [user1, user2] });
      await chat.save();

      const newMessage = new Message({
        chatId: chat._id,
        sender: user1,
        message,
        seenBy: [user1],
      });

      await newMessage.save();

      chat.lastMessage = newMessage._id;
      chat.updatedAt = Date.now();
      await chat.save();

      return res.status(200).json(chat);
    }

    if (chat.lastMessage.sender.toString() === user1.toString()) {
      return res
        .status(200)
        .json({ message: "Wait for a response before sending again." });
    }
    const newMessage = new Message({
      chatId: chat._id,
      sender: user1,
      message,
      seenBy: [user1],
    });
    await newMessage.save();
    chat.lastMessage = newMessage._id;
    chat.updatedAt = Date.now();
    await chat.save();

    res.status(200).json(chat);
  } catch (err) {
    console.error("Error in createOrGetChat:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

exports.getUserChats = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const chats = await Chat.find({
      participants: userId,
    })
      .populate("lastMessage")
      .populate("participants", "firstName lastName martrId")
      .sort({ updatedAt: -1 })
      .lean();

    if (!chats.length) {
      return res.status(404).json({ error: "No chats found for this user." });
    }

    // Filter messages based on `clearedBy`
    const filteredChats = chats.map((chat) => {
      const clearedEntry = chat.clearedBy.find(
        (entry) => entry.user.toString() === userId
      );
      const clearedAt = clearedEntry ? clearedEntry.clearedAt : null;

      if (clearedAt && chat.lastMessage?.createdAt < clearedAt) {
        chat.lastMessage = null;
      }

      return chat;
    });

    res.status(200).json(filteredChats);
  } catch (err) {
    console.error("Error in getUserChats:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

exports.getallchatsRequest = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }

    const chats = await Chat.find({ participants: userId })
      .populate("lastMessage")
      .populate("participants", "firstName lastName martrId")
      .sort({ updatedAt: -1 });

    if (!chats.length) {
      return res.status(404).json({ error: "No chats found for this user." });
    }

    // Convert Mongoose docs to plain objects (if needed)
    const chatObjects = chats.map((chat) => chat.toObject());

    const filteredChats = chatObjects.filter(
      (chat) =>
        chat.status === "other" &&
        chat.lastMessage &&
        chat.lastMessage?.sender.toString() !== userId
    );

    res.status(200).json({
      success: true,
      user: filteredChats,
      message: "Chat status fetched",
    });
  } catch (err) {
    console.error("Error in getAllChatsRequest:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

exports.updateChatStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId, action } = req.body.data;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    if (!chatId || !action) {
      return res
        .status(400)
        .json({ message: "Chat ID and action are required." });
    }

    console.log(chatId);

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    chat.status = action;
    await chat.save();

    console.log(chat);
    res.status(200).json({
      message: `Chat status updated to '${action}' for chat ${chatId} by user ${userId}.`,
    });
  } catch (err) {
    console.error("Error in updateChatStatus:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
};

exports.chatValidator = async (req, res) => {
  try {
    const user1 = req.user.id; // Extract user1 from auth middleware
    const user2 = req.body.profileId; // Access user2 directly from req.body

    if (!user1 || !user2) {
      return res.status(400).json({
        success: false,
        message: "Both user1 and user2 IDs are required.",
      });
    }

    // Check if both users exist
    const userExists1 = await User.findById(user1);
    const userExists2 = await User.findById(user2);

    if (!userExists1 || !userExists2) {
      return res
        .status(404)
        .json({ success: false, message: "One or both users not found." });
    }

    // Check if a chat exists between these users
    let chat = await Chat.findOne({
      participants: { $all: [user1, user2] },
    });

    if (chat) {
      if (chat.status === "rejected") {
        return res.status(403).json({
          success: false,
          message: "This chat has been declined and cannot send messages.",
        });
      }
      return res.status(200).json({
        success: true,
        message: "Chat already exists.",
        chatId: chat._id,
      });
    }

    // If chat doesn't exist, allow message initiation
    return res.status(200).json({
      success: true,
      message: "User validation successful, chat can be initiated.",
    });
  } catch (err) {
    console.error("Error in chat validation:", err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

exports.viewDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.id;
    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const [photoAccess, connectionAccess, profile] = await Promise.all([
      hasAcceptedPhotoAccess(userId, profileId),
      hasAcceptedConnection(userId, profileId),
      User.findById(profileId)
        .populate("filesId")
        .populate("HoroscopicId")
        .populate("profdetailsId"),
    ]);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    let userResponse = profile.toObject();
    userResponse.mobile = maskMobile(profile.mobile);
    userResponse.email = maskEmail(profile.email);

    if (isProfileLocked(userResponse) && !connectionAccess) {
      userResponse = applyLockedProfileVisibility(userResponse, false);
    } else {
      userResponse.filesId = userResponse.filesId || {
        photos: [],
        isPrivate: false,
      };
      userResponse.filesId = filterFilesForViewer(
        userResponse.filesId,
        photoAccess || !userResponse.filesId.isPrivate
      );

      if (connectionAccess) {
        const [paternaldetails, familyDetails] = await Promise.all([
          ExtendedFamily.findOne({ userId: profileId }),
          User.findById(profileId)
            .populate("familydetailsId")
            .then((u) => u?.familydetailsId),
        ]);

        userResponse.paternaldetails = paternaldetails;
        userResponse.familyDetails = familyDetails;
      }
    }

    res.status(200).json({ user: userResponse });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.viewPhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.params.id;
    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const [photoAccess, profile] = await Promise.all([
      hasAcceptedPhotoAccess(userId, profileId),
      User.findById(profileId)
        .populate("filesId")
        .populate("HoroscopicId")
        .populate("profdetailsId")
        .populate("familydetailsId"),
    ]);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    let userResponse = profile.toObject();
    userResponse.filesId = userResponse.filesId || { photos: [], isPrivate: false };
    userResponse.filesId = filterFilesForViewer(
      userResponse.filesId,
      photoAccess || !userResponse.filesId.isPrivate,
      { limit: 2 }
    );

    userResponse.mobile = maskMobile(profile.mobile);
    userResponse.email = maskEmail(profile.email);
    delete userResponse.firstName;
    delete userResponse.middleName;

    res.status(200).json({ user: userResponse });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.ShareTermsAndPolicy = async (req, res) => {
  try {
    const page = await Page.find({ slug: req.params.slug });
    if (page.length === 0) {
      return res.status(200).json({ success: false, message: "No Data Found" });
    }
    res.status(200).json({ success: true, data: page });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

function maskMobile(mobile) {
  if (!mobile || mobile.length < 4) return mobile;
  const visibleLength = Math.floor(mobile.length / 2);
  return (
    mobile.slice(0, visibleLength) + "*".repeat(mobile.length - visibleLength)
  );
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  const visibleLength = Math.floor(local.length / 2);
  return (
    local.slice(0, visibleLength) +
    "*".repeat(local.length - visibleLength) +
    "@" +
    domain
  );
}
