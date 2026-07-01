const {
  MatrimonialUser: User,
  HoroscopeProfile: HoroscopeDetails,
  FamilyProfile: FamilyDetails,
  ProfessionalProfile: ProfessionalDetails,
  ExtendedFamilyProfile: ExtendedFamily,
  Notification,
  SubscriptionLimit: Limit,
  CmsPage: Page,
  MediaAlbum: files,
  Story: Stories,
  VerifiedEmail,
  ContactRequest,
  Admin,
  ChatMessage: Message,
  Chat,
  PasswordResetToken: Tokenschema,
} = require("../models");
const { ProfileView, VisitedProfile } = require("../models/profileView.js");
const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const {
  generateOTP,
  verifyOTP,
  sendNotificationToAdmin,
} = require("../middlewares/middleware.js");

const { generateToken, getNextMatrimonyId } = require("../utils/utility.js");
const { sendAdminForgetPasswordEmail } = require("../utils/email.js");

const express = require("express");
const mongoose = require("mongoose");

const JWT_SECRET = process.env.Admin_SECRET;

exports.register = async (req, res) => {
  const { email, password, role } = req.body.data;
  console.log(req.body, "register");
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }
  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin already exists with this email." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ email, password: hashedPassword, role });
    await newAdmin.save();
    res.status(201).json({ message: "Admin registered successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
};
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log(req.body);

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    const admin = await Admin.findOne({ email: username });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    if (!admin.isActive) {
      return res.status(403).json({ message: "Account is not active." });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.Admin_SECRET,
      {
        expiresIn: "1h",
      }
    );

    return res.status(200).json({ message: "Login successful", token: token });
  } catch (error) {
    console.error("Login error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};
exports.getLimits = async (req, res) => {
  try {
    const limits = await Limit.findOne();
    if (!limits) {
      return res.status(404).json({ message: "Limits not found" });
    }
    res.json(limits);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
exports.updateLimits = async (req, res) => {
  try {
    if (!req.body.data) {
      return res.status(400).json({ message: "No data provided for update" });
    }

    const { freeMessageLimit, freeProfileViews } = req.body.data;
    const updateFields = {};

    // Validate and add only provided fields
    if (freeMessageLimit !== undefined) {
      if (freeMessageLimit < 0 || freeMessageLimit > 999) {
        return res
          .status(400)
          .json({ message: "freeMessageLimit must be between 0 and 999" });
      }
      updateFields.freeMessageLimit = freeMessageLimit;
    }

    if (freeProfileViews !== undefined) {
      if (freeProfileViews < 0 || freeProfileViews > 999) {
        return res
          .status(400)
          .json({ message: "freeProfileViews must be between 0 and 999" });
      }
      updateFields.freeProfileViews = freeProfileViews;
    }

    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    // Find the existing limits or create a new one
    let updatedLimit = await Limit.findOneAndUpdate(
      {}, // Find any document (assuming there's only one record)
      { $set: updateFields },
      { new: true, upsert: true } // If not found, create a new one
    );

    res.json({ message: "Limits updated successfully", updatedLimit });
  } catch (error) {
    console.error("Error updating limits:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getusersData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.find().select(
      "gender firstName middleName lastName dateOfBirth martrId view isVisible isbloacked isApproved avatar isEnable mobile email isSubscribed"
    );
    // console.log(user);
    res.status(200).json({
      message: "Profiles fetched successfully.",
      user,
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.getBlockedProfiles = async (req, res) => {
  try {
    const user = await User.find({ isbloacked: true }).select(
      "gender firstName middleName lastName dateOfBirth martrId view isVisible isbloacked isApproved avatar isEnable mobile email isSubscribed"
    );

    res.status(200).json({
      message: "Blocked profiles fetched successfully.",
      user,
    });
  } catch (error) {
    console.error("Error fetching blocked profiles:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.getDeletedprofiles = async (req, res) => {
  try {
    const user = await User.find({ isEnable: false }).select(
      "gender firstName middleName lastName dateOfBirth martrId view isVisible isbloacked isApproved avatar isEnable mobile email isSubscribed"
    );

    res.status(200).json({
      message: "Enable profiles fetched successfully.",
      user,
    });
  } catch (error) {
    console.error("Error fetching blocked profiles:", error);
    res.status(500).json({ message: "Server error", error });
  }
};
exports.blockuser = async (req, res) => {
  const profileId = req.body.data;
  try {
    const profile = await User.findById(profileId).select("isbloacked");
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    profile.isbloacked = !profile.isbloacked;
    await profile.save();

    return res.status(200).json({ message: "View recorded successfully" });
  } catch (error) {
    console.error("Error recording view:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};
exports.disableuser = async (req, res) => {
  const profileId = req.body.data;
  try {
    const profile = await User.findById(profileId).select("isEnable");
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    profile.isEnable = !profile.isEnable;
    await profile.save();

    return res.status(200).json({ message: "Updated successfully" });
  } catch (error) {
    console.error("Error recording Updated:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.approveuser = async (req, res) => {
  const profileId = req.body.data;

  console.log(req.body);
  try {
    const profile = await User.findById(profileId).select("isApproved");
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    profile.isApproved = !profile.isApproved;
    await profile.save();

    return res.status(200).json({ message: "Updated successfully" });
  } catch (error) {
    console.error("Error recording Updated:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.viewuser = async (req, res) => {
  try {
    const profileId = req.body.data;
    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const [profile, paternaldetails, familyDetails] = await Promise.all([
      User.findById(profileId)
        .populate("filesId")
        .populate("HoroscopicId")
        .populate("profdetailsId")
        .populate("familydetailsId"),
      ExtendedFamily.findOne({ userId: profileId }),
      User.findById(profileId)
        .populate("familydetailsId")
        .then((user) => user?.familydetailsId),
    ]);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    let userResponse = profile.toObject();

    // Send all photos without any privacy checks
    userResponse.filesId = userResponse.filesId || { photos: [] };
    userResponse.filesId.photos = profile.filesId.photos;

    // Include paternal and family details without any conditions
    userResponse.paternaldetails = paternaldetails;
    userResponse.familyDetails = familyDetails;

    console.log(userResponse);

    res.status(200).json({ user: userResponse });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

exports.changestatus = async (req, res) => {
  const storyId = req.body.data;
  console.log(storyId);

  try {
    const story = await Stories.findById(storyId).select("status");
    if (!story) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(story);

    story.status = !story.status;
    await story.save();

    return res.status(200).json({
      message: "Updated successfully",
      story,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getStories = async (req, res) => {
  try {
    const stories = await Stories.find();

    return res.status(200).json({
      message: "Stories data found",
      stories, // Updated key for clarity
    });
  } catch (error) {
    console.error("Error fetching stories:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.storiesData = async (req, res) => {
  try {
    const stories = await Stories.find({ status: true });

    if (!stories || stories.length === 0) {
      return res.status(404).json({
        message: "No stories found",
        stories: [],
      });
    }

    return res.status(200).json({
      message: "Stories data found",
      user: stories,
    });
  } catch (error) {
    console.error("Error fetching stories:", error);

    return res.status(500).json({
      message: "Server error. Please try again later.",
      error: error.message,
    });
  }
};

exports.editstory = async (req, res) => {
  try {
    const storyId = req.body.data;
    console.log(storyId);
    const user = await Stories.findById(storyId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(user);
    return res.status(200).json({
      message: "Stories data found",
      user,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.editRequestStatus = async (req, res) => {
  try {
    const { contactReqId, status } = req.body.data;

    // Validate input
    console.log(contactReqId);
    console.log(status);

    if (!contactReqId || !status) {
      return res.status(400).json({
        message: "Invalid input. Both contactReqId and status are required.",
      });
    }

    // Find contact request by ID
    const user = await ContactRequest.findById(contactReqId);
    if (!user) {
      return res.status(404).json({ message: "Contact request not found." });
    }

    // Update status
    user.status = status;
    await user.save();

    return res.status(200).json({
      message: "Contact request status updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Error updating contact request status:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

exports.getNotification = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate("userId", "name email") // Populating user details if needed
      .sort({ createdAt: -1 });

    console.log(notifications);

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications." });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Error updating notifications:", error);
    res.status(500).json({ message: "Error updating notifications." });
  }
};

// Fetch page by slug

exports.saveTermsAndPolicy = async (req, res) => {
  try {
    const { title, content, slug } = req.body.data;

    // Validate required fields
    if (!title || !content || !slug) {
      return res.status(400).json({
        success: false,
        message: "Title, content, and slug are required.",
      });
    }

    const newPage = await Page.create({ title, content, slug });

    return res.status(201).json({
      success: true,
      data: newPage,
      message: "Page created successfully.",
    });
  } catch (error) {
    console.error("Error saving page:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
exports.TermsofUse = async (req, res) => {
  try {
    const page = await Page.find();
    console.log(page);

    if (page?.length === 0) {
      return res
        .status(200)
        .json({ success: false, message: "No Terms found" });
    }

    res.status(200).json({ success: true, data: page, message: "Data found" });
  } catch (error) {
    console.error("Error fetching page:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.deletePage = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(id);

    const page = await Page.findByIdAndDelete(id);

    if (!page) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found!" });
    }

    res.status(200).json({
      success: true,
      message: "Page deleted successfully",
      data: page,
    });
  } catch (error) {
    console.error("Error deleting page:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.adminforgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(req.body);
    const admin = await Admin.findOne({
      $or: [{ email: email }],
    }).select("email");

    console.log(admin);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found. Please check your email or mobile number.",
      });
    }

    let resp = await sendAdminForgetPasswordEmail(admin.email, admin._id);

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
exports.adminChangePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newPassword, confirmPassword } = req.body;

    console.log(req.body);
    const admin = await Admin.findById(userId);
    if (!admin) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }

    console.log(admin);
    // Compare old password
    const isMatch = await bcrypt.compare(newPassword, admin.password);
    if (isMatch) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the old password",
      });
    }

    // Hash and update the new password
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();
    await Tokenschema.findOneAndDelete({ email: admin.email });

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
