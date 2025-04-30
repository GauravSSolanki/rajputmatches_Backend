const User = require("../models/UserProfile.js");
const HoroscopeDetails = require("../models/HoroscopeDetails");
const FamilyDetails = require("../models/FamilyDetails");
const ProfessionalDetails = require("../models/ProfessionalDetails");
const ExtendedFamily = require("../models/ExtendedFamilyDetails.js");
const { ProfileView, VisitedProfile } = require("../models/profileView.js");
const Notification = require("../models/NotificationSchema.js");
const Limit = require("../models/LimitSchema.js");

const Page = require("../models/PageModel.js");

const files = require("../models/PhotoSchema.js");
const Stories = require("../models/StoriesSchema.js");
const VerifiedEmail = require("../models/VerifiedEmailSchema.js");
const ContactRequest = require("../models/ContactRequest.js");
const EmailVerificationToken = require("../models/EmailVerifySchema.js");

const Message = require("../models/Messages.js");
const Chat = require("../models/Chat.js");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const {
  sendEmail,
  sendNotificationToAdmin,
  sendVerificationEmail,
} = require("../middlewares/middleware.js");

const Tokenschema = require("../models/tokenSchema.js");
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

    console.log(req.body);
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    console.log(user);
    // Compare old password
    const isMatch = await bcrypt.compare(newPassword, user.password);
    if (isMatch) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the old password",
      });
    }

    // Hash and update the new password
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
    const user = await User.findById(userId)
      .select("shortlisted photoReqSent")
      .populate([
        {
          path: "shortlisted.profile",
          select: "middleName lastName height dateOfBirth gender martrId",
          populate: [
            { path: "HoroscopicId", select: "clan" },
            { path: "filesId", select: "photos isPrivate" },
            { path: "profdetailsId", select: "qualifications class" },
            { path: "familydetailsId", select: "occupation" },
          ],
        },
        {
          path: "photoReqSent.userId",
          select: "status",
        },
      ])
      .lean(); // Ensures better performance

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract photoReqSent for quick lookup
    const acceptedPhotoReqs = new Set(
      user.photoReqSent
        ?.filter((req) => req.status === "accepted")
        .map((req) => req.userId.toString())
    );

    // Modify shortlisted profiles while keeping structure same
    user.shortlisted = user.shortlisted.map((entry) => {
      if (!entry.profile || !entry.profile.filesId) return entry; // Return unchanged if no filesId exists

      const { filesId } = entry.profile;
      const isAccepted = acceptedPhotoReqs.has(entry.profile.toString());

      return {
        ...entry, // Keep the original structure intact
        profile: {
          ...entry.profile,
          filesId: {
            ...filesId,
            photos:
              !filesId.isPrivate || isAccepted
                ? filesId.photos.filter((photo) => photo.isAvatar)
                : [], // If private and not accepted, send an empty array
          },
        },
      };
    });

    return res.status(200).json({
      message: "Shortlisted profiles fetched successfully.",
      user,
    });
  } catch (error) {
    console.error("Error fetching shortlisted data:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getviewedData = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select("visitedAt photoReqSent")
      .populate([
        {
          path: "visitedAt",
          select:
            "firstName lastName height gender dateOfBirth HoroscopicId filesId profdetailsId address familydetailsId martrId photoReqReceived",
          populate: [
            { path: "HoroscopicId", select: "clan" },
            { path: "filesId", select: "photos isPrivate" },
            { path: "profdetailsId", select: "qualifications class" },
            { path: "familydetailsId", select: "occupation" },
          ],
        },
        {
          path: "photoReqSent.userId",
          select: "status",
        },
      ])
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Visited Data Before Processing:", user.visitedAt);

    const acceptedPhotoReqs = new Set(
      user.photoReqSent
        .filter((req) => req.status === "accepted")
        .map((req) => req.userId.toString())
    );

    user.visitedAt = user.visitedAt.map((profile) => {
      const isAccepted = acceptedPhotoReqs.has(profile._id.toString());

      const hasReceivedPhotoRequest = profile.photoReqReceived?.some(
        (req) => req.userId.toString() === userId && req.status === "accepted"
      );

      let filteredPhotos = [];

      if (profile.filesId) {
        if (
          !profile.filesId.isPrivate ||
          isAccepted ||
          hasReceivedPhotoRequest
        ) {
          filteredPhotos = profile.filesId.photos.filter(
            (photo) => photo.isAvatar === true
          );
        }
      }

      return {
        ...profile,
        HoroscopicId: profile.HoroscopicId || {},
        profdetailsId: profile.profdetailsId || {},
        familydetailsId: profile.familydetailsId || {},
        filesId: {
          ...profile.filesId,
          photos: filteredPhotos,
        },
      };
    });

    console.log("Visited Data After Processing:", user.visitedAt);

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching viewed data:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getvisitedData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user and apply full population
    const user = await User.findById(userId)
      .select("viewedBy photoReqReceived photoReqSent")
      .populate([
        {
          path: "viewedBy",
          select:
            "firstName lastName height gender dateOfBirth HoroscopicId filesId profdetailsId address familydetailsId martrId photoReqReceived",
          populate: [
            { path: "HoroscopicId", select: "clan" },
            { path: "filesId", select: "photos isPrivate" },
            { path: "profdetailsId", select: "qualifications class" },
            { path: "familydetailsId", select: "occupation" },
          ],
        },
        {
          path: "photoReqSent.userId",
          select: "status",
        },
      ])
      .lean(); // Converts Mongoose document to plain JS object

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract accepted photo requests
    const acceptedPhotoReqs = new Set(
      user.photoReqSent
        .filter((req) => req.status === "accepted")
        .map((req) => req.userId.toString())
    );

    // Modify the `viewedBy` array
    user.viewedBy = user.viewedBy.map((profile) => {
      const isAccepted = acceptedPhotoReqs.has(profile._id.toString());

      // Check if current user's ID is in profile's photoReqReceived and accepted
      const hasReceivedPhotoRequest = profile.photoReqReceived?.some(
        (req) => req.userId.toString() === userId && req.status === "accepted"
      );

      let profileData = JSON.parse(JSON.stringify(profile)); // Ensure deep cloning

      if (profileData.filesId) {
        if (
          !profileData.filesId.isPrivate ||
          isAccepted ||
          hasReceivedPhotoRequest
        ) {
          // If files are public, request was accepted, or user received an accepted photo request, show avatar photos
          profileData.filesId.photos = profileData.filesId.photos.filter(
            (photo) => photo.isAvatar === true
          );
        } else {
          // Files are private and not accepted
          profileData.filesId.photos = [];
        }
      }

      return profileData;
    });

    console.log("Processed viewedBy data:", user.viewedBy);
    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching viewed data:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.deleteShortlistedProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Filter out the profile to be deleted
    const initialLength = user.shortlisted?.length;

    user.shortlisted = user.shortlisted.filter(
      (shortlisted) => shortlisted.profile.toString() !== profileId
    );

    // Check if anything was removed
    if (user.shortlisted.length === initialLength) {
      return res
        .status(404)
        .json({ message: "Profile not found in the shortlist" });
    }
    await user.save();
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

    const user = await User.findById(userId).select("shortlisted");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!Array.isArray(user.shortlisted)) {
      user.shortlisted = [];
    }

    const shortlistedProfile = user.shortlisted.find(
      (item) => item.profile.toString() === profileId
    );

    if (shortlistedProfile) {
      shortlistedProfile.isbookmarked = !shortlistedProfile.isbookmarked;
    } else {
      user.shortlisted.push({ profile: profileId, isbookmarked: true });
    }

    await user.save();

    return res.status(200).json({
      message: "Bookmark status updated successfully",
      isbookmarked: shortlistedProfile ? shortlistedProfile.isbookmarked : true,
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

    const limit = await Limit.find();
    if (!limit) {
      return res.status(500).json({ message: "Limit configuration not found" });
    }

    if (user.reqSentCount >= limit.freeProfileViews && !user.isSubscribed) {
      return res.status(403).json({ message: "Free request limit exceeded" });
    }

    // Add request to the profile if not already sent
    if (!profile.reqReceived.some((req) => req.userId.equals(userId))) {
      profile.reqReceived.push({ userId: userId, status: "pending" });
    }

    if (!user.reqSent.some((req) => req.userId.equals(profileId))) {
      user.reqSent.push({ userId: profileId, status: "pending" });
    }

    // Increment the user's sent request count
    user.reqSentCount++;

    await user.save();
    await profile.save();

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

    const user = await User.findById(userId)
      .select("photoReqSent filesId")
      .populate("filesId", "isPrivate photos");

    const profile = await User.findById(profileId)
      .select("photoReqReceived filesId")
      .populate("filesId", "isPrivate photos");

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
    user.photoReqSent = user.photoReqSent || [];
    profile.photoReqReceived = profile.photoReqReceived || [];
    const isValidObjectId = (id) =>
      id && id.toString().match(/^[0-9a-fA-F]{24}$/);

    if (!isValidObjectId(userId) || !isValidObjectId(profileId)) {
      return res.status(400).json({ message: "Invalid user or profile ID." });
    }

    const hasSentRequest = user.photoReqSent.some(
      (req) => req.userId?.toString() === profileId.toString()
    );
    const hasReceivedRequest = profile.photoReqReceived.some(
      (req) => req.userId?.toString() === userId.toString()
    );

    if (!hasSentRequest) {
      user.photoReqSent.push({ userId: profileId, status: "pending" });
    }
    if (!hasReceivedRequest) {
      profile.photoReqReceived.push({ userId: userId, status: "pending" });
    }

    await user.save();
    await profile.save();

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
    // Perform atomic deletion using MongoDB $pull
    const [userUpdate, profileUpdate] = await Promise.all([
      User.findByIdAndUpdate(
        userId,
        { $pull: { photoReqSent: { userId: profileId } } },
        { new: true }
      ),
      User.findByIdAndUpdate(
        profileId,
        { $pull: { photoReqReceived: { userId: userId } } },
        { new: true }
      ),
    ]);

    if (!userUpdate || !profileUpdate) {
      return res.status(404).json({ message: "User or Profile not found" });
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

    // Convert to ObjectId if needed
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const profileObjectId = new mongoose.Types.ObjectId(profileId);

    // Check if the request exists in both users' lists
    const userExists = await User.findById({
      _id: userObjectId,
      "photoReqReceived.userId": profileObjectId,
    });

    const profileExists = await User.findById({
      _id: profileObjectId,
      "photoReqSent.userId": userObjectId,
    });

    console.log(userExists);
    console.log(profileExists);

    if (!userExists) {
      return res
        .status(404)
        .json({ message: "Request not found in sent list" });
    }

    if (!profileExists) {
      return res
        .status(404)
        .json({ message: "Request not found in received list" });
    }

    const [userUpdate, profileUpdate] = await Promise.all([
      User.updateOne(
        { _id: userObjectId, "photoReqReceived.userId": profileObjectId },
        { $set: { "photoReqReceived.$.status": "accepted" } }
      ),
      User.updateOne(
        { _id: profileObjectId, "photoReqSent.userId": userObjectId },
        { $set: { "photoReqSent.$.status": "accepted" } }
      ),
    ]);

    // console.log(userUpdate);
    // console.log(profileUpdate);

    if (userUpdate.modifiedCount === 0 || profileUpdate.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to update status" });
    }

    return res.status(200).json({ message: "Request rejected successfully" });
  } catch (error) {
    console.error("Error rejecting request:", error);
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

    // Convert to ObjectId if needed
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const profileObjectId = new mongoose.Types.ObjectId(profileId);

    // Check if the request exists in both users' lists
    const userExists = await User.findById({
      _id: userObjectId,
      "photoReqReceived.userId": profileObjectId,
    });

    const profileExists = await User.findById({
      _id: profileObjectId,
      "photoReqSent.userId": userObjectId,
    });

    console.log(userExists);
    console.log(profileExists);

    if (!userExists) {
      return res
        .status(404)
        .json({ message: "Request not found in sent list" });
    }

    if (!profileExists) {
      return res
        .status(404)
        .json({ message: "Request not found in received list" });
    }

    const [userUpdate, profileUpdate] = await Promise.all([
      User.updateOne(
        { _id: userObjectId, "photoReqReceived.userId": profileObjectId },
        { $set: { "photoReqReceived.$.status": "rejected" } }
      ),
      User.updateOne(
        { _id: profileObjectId, "photoReqSent.userId": userObjectId },
        { $set: { "photoReqSent.$.status": "rejected" } }
      ),
    ]);

    // console.log(userUpdate);
    // console.log(profileUpdate);

    if (userUpdate.modifiedCount === 0 || profileUpdate.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to update status" });
    }

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
    // Perform atomic deletion using MongoDB $pull
    const [userUpdate, profileUpdate] = await Promise.all([
      User.findByIdAndUpdate(
        userId,
        { $pull: { reqSent: { userId: profileId } } },
        { new: true }
      ),
      User.findByIdAndUpdate(
        profileId,
        { $pull: { reqReceived: { userId: userId } } },
        { new: true }
      ),
    ]);

    if (!userUpdate || !profileUpdate) {
      return res.status(404).json({ message: "User or Profile not found" });
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

    // Convert to ObjectId if needed
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const profileObjectId = new mongoose.Types.ObjectId(profileId);

    // Check if the request exists in both users' lists
    const userExists = await User.findById({
      _id: userObjectId,
      "reqReceived.userId": profileObjectId,
    });

    const profileExists = await User.findById({
      _id: profileObjectId,
      "reqSent.userId": userObjectId,
    });

    console.log(userExists);
    console.log(profileExists);

    if (!userExists) {
      return res
        .status(404)
        .json({ message: "Request not found in sent list" });
    }

    if (!profileExists) {
      return res
        .status(404)
        .json({ message: "Request not found in received list" });
    }

    const [userUpdate, profileUpdate] = await Promise.all([
      User.updateOne(
        { _id: userObjectId, "reqReceived.userId": profileObjectId },
        { $set: { "reqReceived.$.status": "accepted" } }
      ),
      User.updateOne(
        { _id: profileObjectId, "reqSent.userId": userObjectId },
        { $set: { "reqSent.$.status": "accepted" } }
      ),
    ]);

    // console.log(userUpdate);
    // console.log(profileUpdate);

    if (userUpdate.modifiedCount === 0 || profileUpdate.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to update status" });
    }

    return res.status(200).json({ message: "Request rejected successfully" });
  } catch (error) {
    console.error("Error rejecting request:", error);
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

    // Convert to ObjectId if needed
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const profileObjectId = new mongoose.Types.ObjectId(profileId);

    // Check if the request exists in both users' lists
    const userExists = await User.findById({
      _id: userObjectId,
      "reqReceived.userId": profileObjectId,
    });

    const profileExists = await User.findById({
      _id: profileObjectId,
      "reqSent.userId": userObjectId,
    });

    console.log(userExists.reqReceived);
    console.log(profileExists.reqSent);

    if (!userExists) {
      return res
        .status(404)
        .json({ message: "Request not found in sent list" });
    }

    if (!profileExists) {
      return res
        .status(404)
        .json({ message: "Request not found in received list" });
    }

    const [userUpdate, profileUpdate] = await Promise.all([
      User.updateOne(
        { _id: userObjectId, "reqReceived.userId": profileObjectId },
        { $set: { "reqReceived.$.status": "rejected" } }
      ),
      User.updateOne(
        { _id: profileObjectId, "reqSent.userId": userObjectId },
        { $set: { "reqSent.$.status": "rejected" } }
      ),
    ]);

    console.log(userUpdate);
    console.log(profileUpdate);

    if (userUpdate.modifiedCount === 0 || profileUpdate.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to update status" });
    }

    return res.status(200).json({ message: "Request rejected successfully" });
  } catch (error) {
    console.error("Error rejecting request:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getphotoRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId)
      .select("photoReqSent photoReqReceived")
      .populate([
        {
          path: "photoReqSent.userId",
          select:
            "dateOfBirth gender martrId address HoroscopicId filesId profdetailsId familydetailsId",
          populate: [
            { path: "HoroscopicId", select: "clan" },
            { path: "filesId", select: "photos isPrivate" },
            { path: "profdetailsId", select: "qualifications class" },
            { path: "familydetailsId", select: "occupation" },
          ],
        },
        {
          path: "photoReqReceived.userId",
          select:
            "dateOfBirth gender martrId address HoroscopicId filesId profdetailsId familydetailsId",
          populate: [
            { path: "HoroscopicId", select: "clan" },
            { path: "filesId", select: "photos isPrivate" },
            { path: "profdetailsId", select: "qualifications class" },
            { path: "familydetailsId", select: "occupation" },
          ],
        },
      ])
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // **Create a map of accepted photo requests**
    const photoReqSentMap = new Map(
      user.photoReqSent
        .filter((req) => req.status === "accepted")
        .map((req) => [req.userId.toString(), true])
    );

    // **Filter `photoReqSent` properly**
    user.photoReqSent = user.photoReqSent.map((profile) => {
      const filesId = profile.userId?.filesId;
      const totalPhotos = filesId?.photos?.length || 0;

      const shouldIncludePhotos =
        profile.status === "accepted" || filesId?.isPrivate === false;

      const filteredPhotos = shouldIncludePhotos
        ? filesId.photos.filter((photo) => photo.isAvatar === true)
        : [];

      return {
        ...profile,
        userId: {
          ...profile.userId,
          filesId: {
            ...filesId,
            photos: filteredPhotos,
            totalPhotos,
          },
        },
      };
    });

    // **Filter `photoReqReceived` properly**
    user.photoReqReceived = user.photoReqReceived.map((profile) => {
      const filesId = profile.userId?.filesId;
      const totalPhotos = filesId?.photos?.length || 0;

      const shouldIncludePhotos =
        photoReqSentMap.has(profile.userId?.toString()) ||
        filesId?.isPrivate === false;

      const filteredPhotos = shouldIncludePhotos
        ? filesId.photos.filter((photo) => photo.isAvatar === true)
        : [];

      return {
        ...profile,
        userId: {
          ...profile.userId,
          filesId: {
            ...filesId,
            photos: filteredPhotos,
            totalPhotos,
          },
        },
      };
    });

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching photo requests:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId)
      .select("reqSent reqReceived photoReqSent photoReqReceived")
      .populate([
        {
          path: "reqSent.userId",
          select:
            "dateOfBirth HoroscopicId filesId profdetailsId address familydetailsId martrId gender",
          populate: [
            { path: "HoroscopicId", select: "clan" },
            { path: "filesId", select: "photos isPrivate" },
            { path: "profdetailsId", select: "qualifications class" },
            { path: "familydetailsId", select: "occupation" },
          ],
        },
        {
          path: "reqReceived.userId",
          select:
            "dateOfBirth HoroscopicId filesId profdetailsId address familydetailsId martrId gender",
          populate: [
            { path: "HoroscopicId", select: "clan" },
            { path: "filesId", select: "photos isPrivate" },
            { path: "profdetailsId", select: "qualifications class" },
            { path: "familydetailsId", select: "occupation" },
          ],
        },
      ])
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const photoReqSentMap = new Map(
      user.photoReqSent
        .filter((req) => req.status === "accepted")
        .map((req) => [req.userId.toString(), true])
    );

    user.reqSent = user.reqSent.map((profile) => {
      const totalPhotos = profile.userId.filesId.photos.length;
      const shouldIncludePhotos =
        (photoReqSentMap.has(profile.userId._id.toString()) &&
          profile.status === "accepted") ||
        profile.userId.filesId.isPrivate === false;

      const filteredPhotos = shouldIncludePhotos
        ? profile.userId.filesId.photos.filter(
            (photo) => photo.isAvatar === true
          )
        : [];

      return {
        ...profile,
        userId: {
          ...profile.userId,
          filesId: {
            ...profile.userId.filesId,
            photos: filteredPhotos,
            totalPhotos,
          },
        },
      };
    });

    user.reqReceived = user.reqReceived.map((profile) => {
      const totalPhotos = profile.userId.filesId.photos.length;
      const shouldIncludePhotos =
        (photoReqSentMap.has(profile.userId._id.toString()) &&
          profile.status === "accepted") ||
        profile.userId.filesId.isPrivate === false;

      const filteredPhotos = shouldIncludePhotos
        ? profile.userId.filesId.photos.filter(
            (photo) => photo.isAvatar === true
          )
        : [];

      return {
        ...profile,
        userId: {
          ...profile.userId,
          filesId: {
            ...profile.userId.filesId,
            photos: filteredPhotos,
            totalPhotos,
          },
        },
      };
    });

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.viewProfileById = async (req, res) => {
  const userId = req.user.id;
  const profileId = req.body.profileId;

  try {
    const user = await User.findById(userId).select("photoReqSent");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const acceptedPhotoReqs = new Set(
      user.photoReqSent
        .filter((req) => req.status === "accepted")
        .map((req) => req.userId.toString())
    );

    const profile = await User.findById(profileId)
      .select(
        "firstName lastName height gender dateOfBirth martrId HoroscopicId filesId profdetailsId address familydetailsId"
      )
      .populate([
        { path: "HoroscopicId", select: "clan" },
        { path: "filesId", select: "photos isPrivate" },
        { path: "profdetailsId", select: "qualifications class" },
        { path: "familydetailsId", select: "occupation" },
      ]);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const isAccepted = acceptedPhotoReqs.has(profile._id.toString());

    if (profile.filesId) {
      profile.filesId.photos =
        !profile.filesId.isPrivate || isAccepted ? profile.filesId.photos : [];
    }

    console.log("profile", profile);
    const paternalDetailsData = await ExtendedFamily.find({
      userId: profile._id,
    });

    const paternaldetails = paternalDetailsData.map(
      ({ createdAt, updatedAt, _id, userId, ...filteredData }) => filteredData
    );
    console.log("ppppppp", paternaldetails);
    const profileData = {
      ...profile.toObject(),
      paternaldetails: paternaldetails,
    };

    return res.status(200).json({ profile: profileData });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.addProfileView = async (req, res) => {
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

    if (!profile.viewedBy.some((viewer) => viewer.equals(userId))) {
      profile.viewedBy.push(userId); // Add the viewer to `viewedBy`
      profile.view = (profile.view || 0) + 1; // Increment the view counter
    }

    if (!user.visitedAt.some((visited) => visited.equals(profileId))) {
      user.visitedAt.push(profileId);
    }

    await user.save();
    await profile.save();

    return res.status(200).json({ message: "View recorded successfully" });
  } catch (error) {
    console.error("Error recording view:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.getuserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.shortlist = async (req, res) => {
  try {
    console.log(req.body);
    const userId = req.user.id;
    const profileId = req.body.data;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the profile is already shortlisted
    const isAlreadyShortlisted = user.shortlisted.some(
      (shortlisted) => shortlisted.profile.toString() === profileId
    );

    if (isAlreadyShortlisted) {
      return res
        .status(200)
        .json({ message: "Profile already shortlisted", user });
    }
    // Add the profile to the shortlisted array
    user.shortlisted.push({
      profile: new mongoose.Types.ObjectId(profileId),
    });
    await user.save();
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

    console.log(profileId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $pull: {
          reqSent: { userId: new mongoose.Types.ObjectId(profileId) },
        },
      }
    );

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(profileId) },
      {
        $pull: {
          reqReceived: { userId: new mongoose.Types.ObjectId(userId) },
        },
      }
    );

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

    console.log(profileId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $pull: {
          photoReqSent: { userId: new mongoose.Types.ObjectId(profileId) },
        },
      }
    );

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(profileId) },
      {
        $pull: {
          photoReqReceived: { userId: new mongoose.Types.ObjectId(userId) },
        },
      }
    );

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

    console.log(profileId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profile = await User.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        $pull: {
          reqReceived: { userId: new mongoose.Types.ObjectId(profileId) },
        },
      }
    );

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(profileId) },
      {
        $pull: {
          reqSent: { userId: new mongoose.Types.ObjectId(userId) },
        },
      }
    );

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
    } = req.body.data;

    console.log(req.body.data);

    const user = await User.findById(userId)
      .select("gender isSubscribed photoReqSent reqSent shortlisted")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

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
      const isRequested = user.photoReqSent?.some(
        (req) =>
          req.userId.toString() === profile._id.toString() &&
          req.status === "accepted"
      );

      if (profile.filesId && profile.filesId.photos) {
        const { isPrivate, photos } = profile.filesId;
        const totalPhotos = profile?.filesId?.photos?.length || 0;
        return {
          ...profile,
          filesId: {
            totalPhotos,
            photos: isPrivate
              ? isRequested
                ? photos.filter((p) => p.isAvatar)
                : []
              : photos.filter((p) => p.isAvatar),
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
    let user = await ProfessionalDetails.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    console.log(user);
    if (!user) {
      user = await ProfessionalDetails.create({
        userId: new mongoose.Types.ObjectId(userId),
      });
      const userRecord = await User.findById(userId);
      userRecord.profdetailsId = user._id;
      await userRecord.save();
      await user.save();

      return res.status(201).json({ message: "User created", user });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.saveprofessionaldata = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body.data;
    // console.log(updateData);
    // console.log(userId);

    if (!updateData) {
      return res
        .status(400)
        .json({ message: "Missing updateData in request body." });
    }

    console.log("Update data received:", updateData);

    const updatedProfile = await ProfessionalDetails.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    // const updatedProfile = await ProfessionalDetails.find({ userId: userId });

    console.log("Update:", updatedProfile);

    if (!updatedProfile) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res
        .status(400)
        .json({ message: "Malformed JSON in request body." });
    }

    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the profile." });
  }
};
exports.updateBasicdetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body.data;

    if (!updateData) {
      return res
        .status(400)
        .json({ message: "Missing updateData in request body." });
    }

    console.log("Update data received:", updateData);

    // Validate height fields
    if (updateData.height) {
      const { feet, inches } = updateData.height;

      if (
        (feet && typeof feet !== "number") ||
        (inches && typeof inches !== "number")
      ) {
        return res.status(400).json({
          message: "Height must contain numeric values for feet and inches.",
        });
      }
    }

    // Validate maritalStatus
    if (
      updateData.maritalStatus &&
      !["Single", "Married", "Divorced", "Widowed"].includes(
        updateData.maritalStatus
      )
    ) {
      return res.status(400).json({ message: "Invalid marital status." });
    }

    // Update the user profile
    const updatedProfile = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProfile) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res
        .status(400)
        .json({ message: "Malformed JSON in request body." });
    }

    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the profile." });
  }
};

exports.saveRiligionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await HoroscopeDetails.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    console.log(user);
    if (!user) {
      user = await HoroscopeDetails.create({
        userId: new mongoose.Types.ObjectId(userId),
      });

      const userRecord = await User.findById(userId);

      userRecord.HoroscopicId = user._id;
      await userRecord.save();
      await user.save();
      return res.status(201).json({ message: "User created", user });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.updateRiligionDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body.data;
    if (!updateData) {
      return res
        .status(400)
        .json({ message: "Missing updateData in request body." });
    }

    console.log("Update data received:", updateData);

    const updatedProfile = await HoroscopeDetails.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res
        .status(400)
        .json({ message: "Malformed JSON in request body." });
    }
    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the profile." });
  }
};

exports.saveFamilyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await FamilyDetails.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!user) {
      user = await FamilyDetails.create({
        userId: new mongoose.Types.ObjectId(userId),
      });
      const userRecord = await User.findById(userId);

      userRecord.familydetailsId = user._id;
      await userRecord.save();
      await user.save();

      return res.status(201).json({ message: "User created", user });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.updateFamilyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body.data;

    if (!updateData) {
      return res
        .status(400)
        .json({ message: "Missing updateData in request body." });
    }

    // console.log("Update data received:", updateData);
    const updatedProfile = await FamilyDetails.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    // console.log("Update:", updatedProfile);

    if (!updatedProfile) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Profile updated successfully.",
      data: updatedProfile,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res
        .status(400)
        .json({ message: "Malformed JSON in request body." });
    }

    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the profile." });
  }
};

exports.saveExtendedFamilyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await ExtendedFamily.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!user) {
      user = await ExtendedFamily.create({
        userId: new mongoose.Types.ObjectId(userId),
        grandFatherName: "",
        grandFathersonOf: "",
        grandFatheroccupation: "",
        grandFatherthikana: "",
        grandMotherName: "",
        grandMotherdaughterOf: "",
        grandmotherthikana: "",
        badePapa: [{ name: "", marriedto: "", daughterof: "", thikana: "" }],
        kakosa: [{ name: "", marriedto: "", daughterof: "", thikana: "" }],
        bhuasa: [{ name: "", marriedto: "", sonof: "", thikana: "" }],
        maternalGrandFatherName: "",
        maternalGrandFatherthikana: "",
        maternalGrandFathersonOf: "",
        maternalGrandFatheroccupation: "",
        maternalGrandMotherName: "",
        maternalGrandMotherdaughterOf: "",
        maternalGrandMotherthikana: "",
        mamosa: [{ name: "", marriedto: "", daughterof: "", thikana: "" }],
        masisa: [{ name: "", marriedto: "", sonof: "", thikana: "" }],
      });
      return res.status(201).json({ message: "User created", user });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.updateExtendedFamilyDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body.data;
    console.log(userId);

    if (!updateData) {
      return res
        .status(400)
        .json({ message: "Missing updateData in request body." });
    }

    console.log("Update data received:", updateData);
    let user = await ExtendedFamily.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    Object.keys(updateData).forEach((key) => {
      if (Array.isArray(updateData[key])) {
        if (Array.isArray(user[key])) {
          user[key] = updateData[key];
        } else {
          user[key] = updateData[key];
          console.log(`Created new array key '${key}' in user object.`);
        }
      } else {
        if (!(key in user)) {
          console.log(`Created new key '${key}' in user object.`);
        }
        user[key] = updateData[key];
      }
    });

    console.log("Updated User Data:", user);
    await user.save();

    console.log("Update:", user);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json({
      message: "Profile updated successfully.",
      data: user,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res
        .status(400)
        .json({ message: "Malformed JSON in request body." });
    }

    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the profile." });
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

    const user = await User.findById(user1)
      .select("reqSent photoReqSent")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User1 not found." });
    }

    const isInReqSent = user.reqSent.some(
      (req) => req.userId.toString() === user2 && req.status !== "rejected"
    );

    if (!isInReqSent) {
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

    const [user, profile] = await Promise.all([
      User.findById(userId).select("photoReqSent reqSent"),
      User.findById(profileId)
        .populate("filesId")
        .populate("HoroscopicId")
        .populate("profdetailsId"),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const isPhotoReqSent =
      Array.isArray(user.photoReqSent) &&
      user.photoReqSent.some(
        (req) =>
          req.userId.toString() === profileId && req.status === "accepted"
      );

    const isReqSent =
      Array.isArray(user.reqSent) &&
      user.reqSent.some(
        (req) =>
          req.userId.toString() === profileId && req.status === "accepted"
      );

    console.log("isPhotoReqSent:", isPhotoReqSent);
    console.log("isReqSent:", isReqSent);

    // Ensure filesId exists before accessing its properties
    profile.filesId = profile.filesId || { photos: [], isPrivate: false };

    profile.filesId.photos =
      (profile.filesId.photos.length !== 0 && !profile.filesId.isPrivate) ||
      (profile.filesId.isPrivate && isPhotoReqSent)
        ? profile.filesId.photos
        : [];

    let userResponse = profile.toObject();

    // Mask mobile and email
    userResponse.mobile = maskMobile(profile.mobile);
    userResponse.email = maskEmail(profile.email);

    if (isReqSent) {
      const [paternaldetails, familyDetails] = await Promise.all([
        ExtendedFamily.findOne({ userId: profileId }),
        User.findById(profileId)
          .populate("familydetailsId")
          .then((user) => user?.familydetailsId),
      ]);

      userResponse.paternaldetails = paternaldetails;
      userResponse.familyDetails = familyDetails;
    }

    console.log(userResponse);

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
    const user = await User.findById(userId).select("photoReqSent");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isPhotoReqSent = user.photoReqSent.some(
      (req) => req.userId.toString() === profileId && req.status == "accepted"
    );

    console.log(isPhotoReqSent);

    const profile = await User.findById(profileId)
      .populate("filesId")
      .populate("HoroscopicId")
      .populate("profdetailsId")
      .populate("familydetailsId");

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    profile.filesId.photos =
      (profile.filesId.photos.length !== 0 && !profile.filesId.isPrivate) ||
      (profile.filesId.isPrivate && isPhotoReqSent)
        ? profile.filesId.photos.slice(0, 2) // Send only first 2 images
        : [];

    let userResponse = profile.toObject();

    // Mask mobile and email
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
