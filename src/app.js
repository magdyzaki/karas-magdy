const express = require("express");
const cors = require("cors");
require("dotenv").config();

const healthRoute = require("./routes/health.route");
const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./modules/user/user.routes");
const conversationRoutes = require("./modules/conversation/conversation.routes");
const messageRoutes = require("./modules/message/message.routes");
const storyRoutes = require("./modules/story/story.routes");
const broadcastRoutes = require("./modules/broadcast/broadcast.routes");

const app = express();
const path = require("path");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/health", healthRoute);
app.use("/api/health", healthRoute);
app.use("/api/upload", require("./routes/upload.route"));
app.use("/api/proxy-image", require("./routes/proxy-image.route"));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/broadcasts", broadcastRoutes);
app.use("/api/invites", require("./modules/invite/invite.routes"));
app.use("/api/admin", require("./modules/admin/admin.routes"));
app.use("/api/backup", require("./routes/backup.route"));
app.use("/api/giphy", require("./routes/giphy.route"));

module.exports = app;
