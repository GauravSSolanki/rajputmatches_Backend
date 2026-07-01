const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const path = require("path");
const EmailVerificationToken = require("../models/EmailVerifySchema");
const Tokenschema = require("../models/tokenSchema");
const { generateToken } = require("../utils/utility");

exports.sendAdminForgetPasswordEmail = async (email, adminId) => {
  try {
    const token = jwt.sign({ id: adminId }, process.env.Admin_SECRET, {
      expiresIn: "1h",
    });

    const lastRequest = await Tokenschema.findOne({ userId: adminId });

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
        userId: adminId,
        createdAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const verificationLink = `${process.env.ADMIN_URL}/set-new-password?token=${token}&adminId=${adminId}`;

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
            <a href="${verificationLink}" style="background-color: #992525; color: white; padding: 12px 24px; text-decoration: none; font-size: 16px; border-radius: 5px; display: inline-block;"     onclick="this.style.backgroundColor='#b33b3b'; setTimeout(() => this.style.backgroundColor='#992525', 200);">
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
      message: "A admin password reset link has been sent to your email.",
    };
  } catch (error) {
    console.error("Error sending reset email:", error);
    return {
      success: false,
      message: "Unable to send reset link. Please try again later.",
    };
  }
};
