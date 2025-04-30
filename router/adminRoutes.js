const express = require("express");
const ContactRequest = require("../models/ContactRequest.js");
const {
  register,
  login,
  getusersData,
  getBlockedProfiles,
  getDeletedprofiles,
  blockuser,
  disableuser,
  approveuser,
  viewuser,
  editRequestStatus,

  changestatus,
  storiesData,
  getStories,
  editstory,

  markAllAsRead,
  getNotification,

  updateLimits,
  getLimits,

  saveTermsAndPolicy,
  ShareTermsAndPolicy,
  TermsofUse,
  deletePage,
} = require("../controllers/adminController.js");

const {
  isAuth,
  isadminAuth,
  isAdmin,
  singleFileUpload,
} = require("../middlewares/middleware.js");

const router = express.Router();
const fs = require("fs-extra");
const User = require("../models/UserProfile.js");
const Stories = require("../models/StoriesSchema.js");

// Admin-only story creation
const { createCanvas, loadImage } = require("canvas");

const convertImageToBase64 = async (imagePath) => {
  try {
    const image = await loadImage(imagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const maxWidth = 800;
    const maxHeight = 800;
    let width = image.width;
    let height = image.height;

    if (width > maxWidth || height > maxHeight) {
      const aspectRatio = width / height;
      if (width > height) {
        width = maxWidth;
        height = Math.round(maxWidth / aspectRatio);
      } else {
        height = maxHeight;
        width = Math.round(maxHeight * aspectRatio);
      }
    }

    const resizedCanvas = createCanvas(width, height);
    const resizedCtx = resizedCanvas.getContext("2d");
    resizedCtx.drawImage(canvas, 0, 0, width, height);

    const compressedBase64 = resizedCanvas.toDataURL("image/jpeg", 0.8);

    return compressedBase64;
  } catch (err) {
    console.error("Error processing image file:", err.message);
    return null;
  }
};

// router.put("/register", isadminAuth, isAdmin, register);
router.put("/register", register);

router.post("/login", login);
router.post(
  "/stories",
  isadminAuth,
  isAdmin,
  singleFileUpload,
  async (req, res) => {
    try {
      const { title, description } = req.body;
      // console.log(req.body);
      // console.log(req.file);

      if (!title || !description) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const base64 = await convertImageToBase64(req.file.path);
      fs.unlinkSync(req.file.path);

      const newStory = new Stories({
        title,
        image: base64,
        description,
      });

      await newStory.save();

      res.status(201).json({
        message: "Story created successfully",
        newStory,
      });
    } catch (error) {
      console.error("Error creating story:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }
);
router.put(
  `/update-story/:id`,
  isadminAuth,
  isAdmin,
  singleFileUpload,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description } = req.body;

      // Validate request fields
      if (!title || !description) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Find the existing story
      const story = await Stories.findById(id); // Use the id from params
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }

      // Handle image upload, if provided
      let updatedImage = story.image; // Keep the old image if no new one is uploaded
      if (req.file) {
        const base64 = await convertImageToBase64(req.file.path); // Convert new image to base64
        fs.unlinkSync(req.file.path); // Remove the temp file
        updatedImage = base64; // Update image
      }

      // Update story fields
      story.title = title;
      story.description = description;
      story.image = updatedImage;
      await story.save(); // Save updated story

      res.status(200).json({
        message: "Story updated successfully",
        story,
      });
    } catch (error) {
      console.error("Error updating story:", error);
      res.status(500).json({ message: "Server error", error });
    }
  }
);
router.put("/change-status", isadminAuth, isAdmin, changestatus);
router.get("/getallstory", getStories);
router.put("/getStory", isadminAuth, editstory);
router.get("/profile/stories", storiesData);
router.get("/notifications", getNotification);
router.put("/notifications/mark-all-read", markAllAsRead);
// // admin
router.put("/Edit-request", isadminAuth, editRequestStatus);
router.get("/profile", isadminAuth, getusersData);
router.get("/blocked-profile", isadminAuth, getBlockedProfiles);
router.get("/deleted-profile", isadminAuth, getDeletedprofiles);
router.get("/contact-requests", async (req, res) => {
  try {
    const messages = await ContactRequest.find();
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching contact messages:", error);
    res.status(500).json({ message: "Server error", error });
  }
});
router.put("/block-member", isadminAuth, isAdmin, blockuser);
router.put("/delete-member", isadminAuth, isAdmin, disableuser);
router.put("/Approve-member", isadminAuth, isAdmin, approveuser);
router.put("/view-member", isadminAuth, isAdmin, viewuser);

router.get("/limits", isadminAuth, getLimits);

router.put("/terms/:slug", isadminAuth, isAdmin, saveTermsAndPolicy);
router.get("/terms", isadminAuth, isAdmin, TermsofUse);
router.delete("/terms/:id", isadminAuth, isAdmin, deletePage);

router.put("/limits/update", isadminAuth, isAdmin, updateLimits);
router.get("/dashboard/user-counts", async (req, res) => {
  try {
    // Total members
    const totalMembers = await User.countDocuments();

    // Free members: These will be users whose `isSubscribed` is false
    const freeMembers = await User.countDocuments({
      isSubscribed: false,
    });

    // Blocked members: These are users with `isBlocked` set to true
    const blockedMembers = await User.countDocuments({
      isbloacked: true,
    });

    // Premium members: These will be users whose `isSubscribed` is true
    const premiumMembers = await User.countDocuments({
      isSubscribed: true,
    });

    return res.status(200).json({
      message: "User counts fetched successfully",
      data: {
        totalMembers,
        freeMembers,
        blockedMembers,
        premiumMembers,
      },
    });
  } catch (error) {
    console.error("Error fetching user counts:", error);
    return res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
