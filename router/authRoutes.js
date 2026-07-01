const express = require("express");
const {
  ContactRequest,
  MediaAlbum: files,
  MatrimonialUser: User,
  Story: Stories,
  ChatMessage: Message,
} = require("../models");
const Jimp = require("jimp");
const mongoose = require("mongoose");
const {
  viewDetails,
  viewPhotos,
  sendVerification,
  verifyEmail,
  signup,
  login,
  shortlist,
  profiledelete,
  profilerequestdelete,
  Removerequest,

  forgotPassword,
  deleteShortlistedProfile,
  profilebookmark,
  resetPassword,
  addProfileView,
  getRequests,
  viewProfileById,
  getphotoRequests,
  sendphotoRequest,

  withdrawal,
  acceptRequest,
  rejectRequest,

  reqwithdrawal,
  reqacceptRequest,
  reqrejectRequest,

  sendRequest,
  getviewedData,
  getvisitedData,
  getshortlistedData,
  getuserData,
  getprofiles,
  getprofessionaldata,
  saveprofessionaldata,
  updateBasicdetails,
  saveRiligionDetails,
  updateRiligionDetails,
  saveFamilyDetails,
  updateFamilyDetails,
  saveExtendedFamilyDetails,
  updateExtendedFamilyDetails,
  updateimageprivacy,
  createContactRequest,

  getallchatsRequest,
  updateChatStatus,
  sendMessage,
  getMessages,
  deleteMessage,
  createOrGetChat,
  getUserChats,
  chatValidator,

  ShareTermsAndPolicy,
} = require("../controllers/authController");

const {
  isAuth,
  isAdmin,
  isUser,
  fileFilter,
  multipleFileUpload,
  singleFileUpload,
} = require("../middlewares/middleware.js");

const { validate } = require("../middlewares/validate.js");
const {
  updateBasicProfileSchema,
  saveProfessionalDataSchema,
  updateReligionDetailsSchema,
  updateFamilyDetailsSchema,
  updateExtendedFamilySchema,
} = require("../validators/profileSchemas.js");

const router = express.Router();
const fs = require("fs-extra");
const path = require("path");
const multer = require("multer");

router.get("/profile/view/:id", isAuth, viewDetails);
router.get("/profile/view/images/:id", isAuth, viewPhotos);

router.put("/getprofiles", isAuth, getprofiles);
router.put("/profile/shortlist", isAuth, shortlist);
router.put("/profile/view", isAuth, addProfileView);
router.put("/profile/request", isAuth, sendRequest);
router.put("/profile/photoRequest", isAuth, sendphotoRequest);

router.put("/profile/withdrawal", isAuth, withdrawal);
router.put("/profile/accept", isAuth, acceptRequest);
router.put("/profile/reject", isAuth, rejectRequest);

router.put("/profile/reqsent/withdrawal", isAuth, reqwithdrawal);
router.put("/profile/reqsent/accept", isAuth, reqacceptRequest);
router.put("/profile/reqsent/reject", isAuth, reqrejectRequest);

router.put("/profile/shortlisted/delete", isAuth, deleteShortlistedProfile);
router.put("/profile/shortlisted/edit", isAuth, profilebookmark);

router.get("/profile/show-shortlisted", isAuth, getshortlistedData);
router.get("/profile/viewed", isAuth, getviewedData);
router.get("/profile/visited", isAuth, getvisitedData);
router.get("/profile/myrequests", isAuth, getRequests);
router.get("/profile/view", isAuth, viewProfileById);
router.get("/profile/photorequests", isAuth, getphotoRequests);
router.put("/profile/delete", isAuth, profiledelete);
router.put("/profile/delete/delete", isAuth, profilerequestdelete);
//remove profile
router.put("/profile/req/delete", isAuth, Removerequest);

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

router.post("/upload-files", isAuth, multipleFileUpload, async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await files.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const filePaths = await Promise.all(
      req.files.map(async (file) => {
        const base64 = await convertImageToBase64(file.path);
        fs.unlinkSync(file.path);
        return base64;
      })
    );

    const photoPaths = filePaths.map((file) => ({
      url: file,
      isAvatar: false,
    }));

    if (!user) {
      user = new files({
        userId: new mongoose.Types.ObjectId(userId),
        photos: [],
        documents: [],
      });
    }

    user.photos.push(...photoPaths);
    await user.save();

    res.status(200).json({
      message: "Files uploaded successfully",
      photos: user.photos,
      documents: user.documents,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post(
  "/upload-documents",
  isAuth,
  multipleFileUpload,
  async (req, res) => {
    try {
      const userId = req.user.id;

      console.log(userId);
      let user = await files.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const filePaths = await Promise.all(
        req.files.map(async (file) => {
          const base64 = await convertImageToBase64(file.path);
          fs.unlinkSync(file.path); // Remove the file after conversion
          return base64;
        })
      );

      const documentPaths = filePaths.map((file) => ({ url: file }));
      user.documents.push(...documentPaths);
      await user.save();

      console.log("userrrr ", user);

      res.status(200).json({
        message: "Files uploaded successfully",
        photos: user.photos,
        documents: user.documents,
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  }
);

router.post("/upload-files", isAuth, multipleFileUpload, async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await files.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Process the files asynchronously
    const filePaths = await Promise.all(
      req.files.map(async (file) => {
        const base64 = await convertImageToBase64(file.path);
        fs.unlinkSync(file.path); // Remove the file after conversion
        return base64;
      })
    );

    const photoPaths = filePaths.map((file) => ({
      url: file,
      isAvatar: false,
    }));

    // Add the photo paths to the user's photo array
    if (!user) {
      // Create a new user record if it doesn't exist
      user = new files({
        userId: new mongoose.Types.ObjectId(userId),
        photos: [],
        documents: [],
      });
    }

    user.photos.push(...photoPaths);
    await user.save();

    res.status(200).json({
      message: "Files uploaded successfully",
      photos: user.photos,
      documents: user.documents,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/files", isAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await files.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!user) {
      user = await files.create({
        userId: new mongoose.Types.ObjectId(userId),
      });

      const userRecord = await User.findById(userId);
      console.log("userr", userRecord);
      userRecord.filesId = user._id;
      await userRecord.save();
      await user.save();
      return res.status(201).json({ message: "User files created", user });
    }
    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get("/profile", isAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await files.findOne(
      {
        userId: new mongoose.Types.ObjectId(userId),
        "photos.isAvatar": true,
      },
      {
        "photos.$": 1,
        isPrivate: 1,
        _id: 0,
      }
    );

    if (!user || !user.photos || user.photos.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({
      message: "Data found",
      user: {
        userProfile: user.photos[0],
        isPrivate: user.isPrivate,
      },
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

router.post("/upload-files", isAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await files.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });
    console.log("Photo Paths:", photoPaths);
    user.photos.push(...photoPaths);
    await user.save();

    res.status(200).json({
      message: "Files uploaded successfully",
      photos: user.photos,
      documents: user.documents,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/set-profile-image", isAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    const user = await files.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    const profile = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    user.photos = user.photos.map((photo) => ({
      ...photo.toObject(),
      isAvatar: photo._id.toString() === profileId,
    }));

    const avatarPhoto = user.photos.find(
      (photo) => photo._id.toString() == profileId
    );

    if (avatarPhoto) {
      profile.avatar = avatarPhoto.url;
    }

    // Save the changes
    await user.save();
    await profile.save();

    res.status(200).json({
      message: "Profile image updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error setting profile image:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/delete-image", isAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const profileId = req.body.data;

    if (!profileId) {
      return res.status(400).json({ message: "Profile ID is required" });
    }

    const user = await files.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find and delete from photos array
    let photoToDelete = user.photos.find(
      (photo) => photo._id.toString() === profileId
    );

    if (photoToDelete) {
      user.photos = user.photos.filter(
        (photo) => photo._id.toString() !== profileId
      );
    } else {
      // Find and delete from documents array
      photoToDelete = user.documents.find(
        (document) => document._id.toString() === profileId
      );

      if (photoToDelete) {
        user.documents = user.documents.filter(
          (document) => document._id.toString() !== profileId
        );
      } else {
        return res.status(404).json({ message: "Image not found" });
      }
    }

    // Remove avatar reference if it was deleted
    const profile = await User.findById(userId);
    if (profile && profile.avatar === photoToDelete.url) {
      profile.avatar = "";
      await profile.save();
    }

    await user.save();

    res.status(200).json({
      message: "Image deleted successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.put("/update-privacy", isAuth, updateimageprivacy);

// User authentication routes
router.post("/signup", signup);
router.post("/login", login);

router.post("/logout", (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/forgot-password", forgotPassword);
//register verify email
router.post("/send-verification", sendVerification);
router.get("/email/verify-email", verifyEmail);
router.post("/reset-password", isAuth, resetPassword);

router.get("/user", isAuth, getuserData);
router.put(
  "/update-profile",
  isAuth,
  validate(updateBasicProfileSchema),
  updateBasicdetails
);

router.get("/get-professional-data", isAuth, getprofessionaldata);
router.put(
  "/save-professional-data",
  isAuth,
  validate(saveProfessionalDataSchema),
  saveprofessionaldata
);

// Religion details routes
router.get("/get-religiondetails", isAuth, saveRiligionDetails);
router.put(
  "/update-religiondetails",
  isAuth,
  validate(updateReligionDetailsSchema),
  updateRiligionDetails
);

// Family details routes
router.get("/get-family-details", isAuth, saveFamilyDetails);
router.put(
  "/update-family-details",
  isAuth,
  validate(updateFamilyDetailsSchema),
  updateFamilyDetails
);

// Extended family details routes
router.get("/getpaternal-details", isAuth, saveExtendedFamilyDetails);
router.put(
  "/updatepaternal-details",
  isAuth,
  validate(updateExtendedFamilySchema),
  updateExtendedFamilyDetails
);

//
router.put("/contactus", createContactRequest);
// chat app routes
router.get("/messages", isAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    console.log(senderId);

    if (!senderId) {
      return res.status(400).json({ message: "Sender ID is required" });
    }
    if (!senderId) {
      return res.status(400).json({ message: "Invalid sender ID" });
    }
    const user = await User.findById(senderId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const messages = await Message.find({ sender: senderId }).sort({
      timestamp: -1,
    });

    console.log(messages);
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
router.get("/chat/status", isAuth, getallchatsRequest);
router.put("/chat/status/update", isAuth, updateChatStatus);
router.post("/message/send", isAuth, sendMessage);
router.put("/message", isAuth, getMessages);
router.post("/delete/message", isAuth, deleteMessage);
router.put("/profile/message", isAuth, createOrGetChat);
router.get("/message/chat", isAuth, getUserChats);
router.post("/chat/validate", isAuth, chatValidator);

router.get("/terms/:slug", ShareTermsAndPolicy);
router.get("/", (req, res) => {
  res.send("server running");
});

module.exports = router;
