const express = require("express");

const authRoutes = require("./auth.routes.js");
const meRoutes = require("./me.routes.js");
const profileRoutes = require("./profile.routes.js");
const connectionRequestRoutes = require("./connectionRequest.routes.js");
const photoRequestRoutes = require("./photoRequest.routes.js");
const mediaRoutes = require("./media.routes.js");
const chatRoutes = require("./chat.routes.js");
const publicRoutes = require("./public.routes.js");

const router = express.Router();

/**
 * API v1 layout:
 * - router file     → defines URLs + validation + middleware
 * - controller file → business logic
 * - validator file  → Zod schemas
 * - service file    → database helpers (when logic grows)
 */

router.get("/health", (req, res) => {
  res.json({ success: true, message: "API v1 is running" });
});

router.use("/auth", authRoutes);
router.use("/me", meRoutes);
router.use("/profiles", profileRoutes);
router.use("/connection-requests", connectionRequestRoutes);
router.use("/photo-requests", photoRequestRoutes);
router.use("/media", mediaRoutes);
router.use("/chats", chatRoutes);
router.use("/public", publicRoutes);

module.exports = router;
