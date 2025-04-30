const jwt = require("jsonwebtoken");
const multer = require("multer");
const fs = require("fs-extra");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const axios = require("axios");
const qs = require("qs");
const twilio = require("twilio");
const User = require("../models/UserProfile");
const Admin = require("../models/Admin");
const EmailVerificationToken = require("../models/EmailVerifySchema");
const Tokenschema = require("../models/tokenSchema");

const { generateToken } = require("../utils/utility");

const sendVerificationEmail = async (email) => {
  try {
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex");

    // Prevent duplicate key error by updating existing token or creating a new one
    await EmailVerificationToken.findOneAndUpdate(
      { email }, // Search by email
      { token, createdAt: new Date() }, // Update token and timestamp
      { upsert: true, new: true, setDefaultsOnInsert: true } // Create new if not found
    );

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Use env variables for security
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Rajput Matches" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Rajput Matches - Verify Your Email",
      html: `
       <div style="
    font-family: Arial, sans-serif; 
    max-width: 600px; 
    margin: auto; 
    padding: 20px; 
    border: 1px solid #e0e0e0; 
    border-radius: 10px; 
    background-color: white;
    text-align: center;
">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:logoRed" alt="Rajput Matches Logo" style="max-width: 450px; display: block; margin: 0 auto;">
          </div>
    
          <h2 style="color: #333333;">✅ Verify Your Email</h2>
          
          <p style="font-size: 16px; color: #555555;">
            Thank you for signing up! Click the button below to verify your email.
          </p>
          
          <div style="margin: 20px 0;">
            <a href="${verificationLink}" style="
              background-color: #992525; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              font-size: 16px; 
              border-radius: 5px; 
              display: inline-block;
            ">
              Verify Email
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777777;">
            If you did not request this, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #888888;">
            &copy; ${new Date().getFullYear()} Rajput Matches. All rights reserved.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: "logoRed.png",
          path: path.join(__dirname, "../uploads/avatar/logowhite.png"),
          cid: "logoRed", // Embedded image reference
        },
      ],
    };
    await transporter.sendMail(mailOptions);
    return { success: true, message: "Verification email sent!" };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error: error.message };
  }
};

const sendEmail = async (email, userId) => {
  try {
    const token = generateToken(userId);

    const lastRequest = await Tokenschema.findOne({ email });

    if (lastRequest && lastRequest.createdAt) {
      const timeElapsed = (Date.now() - lastRequest.createdAt) / 1000 / 60; // Convert ms to minutes
      if (timeElapsed < 10) {
        return {
          success: false,
          message:
            "A password reset link has already been sent. Please try again after 10 minutes.",
        };
      }
    }

    await Tokenschema.findOneAndUpdate(
      { email },
      {
        email,
        token,
        userId,
        createdAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const verificationLink = `${process.env.FRONTEND_URL}/set-new-password?token=${token}&userid=${userId}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Rajput Matches" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset - Rajput Matches",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: white; text-align: center;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:logoWhite" alt="Rajput Matches Logo" style="max-width: 450px; display: block; margin: 0 auto;">
          </div>
    
          <h2 style="color: #333333;">🔒 Reset Your Password</h2>
          
          <p style="font-size: 16px; color: #555555;">
            Click the button below to reset your password.
          </p>
          
          <div style="margin: 20px 0;">
            <a href="${verificationLink}" style="background-color: #992525; color: white; padding: 12px 24px; text-decoration: none; font-size: 16px; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 14px; color: #777777;">
            If you didn't request this, please ignore this email.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          
          <p style="font-size: 12px; color: #888888;">
            &copy; ${new Date().getFullYear()} Rajput Matches. All rights reserved.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: "logowhite.png",
          path: path.join(__dirname, "../uploads/avatar/logowhite.png"),
          cid: "logoWhite",
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    return {
      success: true,
      message: "A password reset link has been sent to your email.",
    };
  } catch (error) {
    console.error("Error sending reset email:", error);
    return {
      success: false,
      message: "Unable to send reset link. Please try again later.",
    };
  }
};

const isAuth = (req, res, next) => {
  // Check session authentication
  if (req.session?.userId) {
    req.user = { id: req.session.userId };
    return next();
  }

  // Check JWT authentication
  const token = req.headers?.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
};

const isadminAuth = (req, res, next) => {
  // Check session authentication
  // if (req.session?.userId) {
  //   req.user = { id: req.session.userId };
  //   return next();
  // }

  // Check JWT authentication
  const token = req.headers?.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  jwt.verify(token, process.env.Admin_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
};

const sendNotificationToAdmin = async (message) => {
  try {
    // Configure the email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMIN_EMAIL,
        pass: process.env.ADMIN_EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL, // Send to admin email
      subject: "New User Registration Notification",
      text: message,
    };

    await transporter.sendMail(mailOptions);
    console.log("Admin notification sent successfully.");
  } catch (error) {
    console.error("Error sending admin notification:", error);
  }
};

const isUser = async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId).select("gender role");
  if (user?.role !== "user") {
    return res
      .status(403)
      .json({ message: "Access denied. User role required." });
  }
  next();
};

const isAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized access." });
    }

    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    console.log("User ID:", userId);
    console.log("User Role:", user.role);

    if (["admin", "superadmin", "moderator"].includes(user.role)) {
      return next();
    }

    return res
      .status(403)
      .json({ message: "Access denied. Admin role required." });
  } catch (error) {
    console.error("Authorization error:", error.message);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};

const ensureFolderExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads/avatar");
    ensureFolderExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix =
      "image_" + Date.now() + "_" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${fileExtension}`);
  },
});

// File filter for valid image types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, and JPG are allowed."),
      false
    );
  }
};

const multipleFileUpload = multer({
  storage,
  fileFilter,
  limits: { files: 10 },
}).array("avatars", 10);

const singleFileUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
}).single("avatar");

module.exports = {
  isAuth,
  isadminAuth,
  isAdmin,
  isUser,
  fileFilter,
  multipleFileUpload,
  singleFileUpload,
  sendNotificationToAdmin,
  sendVerificationEmail,
  sendEmail,
};
