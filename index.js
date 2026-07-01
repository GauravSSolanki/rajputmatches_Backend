const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();

  if (!process.env.FRONTEND_URL) {
    console.error("❌ FRONTEND_URL is not defined in environment variables");
    process.exit(1);
  }

  const allowedOrigins = process.env.FRONTEND_URL.split(",").map((url) =>
    url.trim()
  );

  const app = express();
  const server = http.createServer(app);

  const io = socketIo(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS (socket)"));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
  });

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "supersecret",
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.DB_URI,
        collectionName: "sessions",
      }),
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24,
      },
    })
  );

  app.use(
    cors({
      origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS (HTTP)"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(
    "/uploads/avatar",
    express.static(
      path.join(__dirname, process.env.UPLOADS_PATH || "uploads/avatar")
    )
  );

  const authRoutes = require("./router/authRoutes");
  const adminRoutes = require("./router/adminRoutes");
  const v1Routes = require("./router/v1/index.js");
  const { errorHandler } = require("./middlewares/errorHandler.js");

  app.use("/api/v1", v1Routes);
  app.use("/", authRoutes);
  app.use("/admin", adminRoutes);

  app.use(errorHandler);

  io.on("connection", (socket) => {
    console.log("✅ New client connected:", socket.id);

    socket.on("sendMessage", (data) => {
      io.emit("newMessage", data);
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  }).on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`❌ Port ${PORT} is already in use. Stop the other node/nodemon process first.`);
    } else {
      console.error("❌ Server failed to start:", err.message);
    }
    process.exit(1);
  });
};

startServer();
