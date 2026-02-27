// استخدام Google DNS لتجنب مشكلة querySrv ECONNREFUSED
require("dns").setServers(["8.8.8.8", "8.8.4.4"]);
require("dotenv").config();
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const selfsigned = require("selfsigned");
const app = require("./app");
const connectDB = require("./config/db");
const User = require("./modules/user/user.model");
const { setupCallHandlers } = require("./socket/callHandler");
const { setupTypingHandlers } = require("./socket/typingHandler");
const { setupOnlineHandlers } = require("./socket/onlineHandler");

const PORT = process.env.PORT || 5000;
// في الإنتاج (سحابي): المنصة توفر HTTPS، نستخدم HTTP داخلياً
const USE_HTTPS = process.env.NODE_ENV !== "production" && process.env.HTTPS !== "false";

const startServer = async () => {
  await connectDB();

  let server;
  if (USE_HTTPS) {
    const attrs = [{ name: "commonName", value: "localhost" }];
    const pems = await selfsigned.generate(attrs, { days: 365, algorithm: "sha256" });
    server = https.createServer({ key: pems.private, cert: pems.cert }, app);
  } else {
    server = http.createServer(app);
  }

  const io = new Server(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
  });

  app.set("io", io);

  // ربط المستخدم بغرفة حسب userId للوصول الفوري
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error("User not found"));
      if (user.isBanned) return next(new Error("Banned"));
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    console.log(`📡 User connected: ${socket.userId}`);
    socket.on("disconnect", () => {
      console.log(`📡 User disconnected: ${socket.userId}`);
    });
  });

  setupCallHandlers(io);
  setupTypingHandlers(io);
  setupOnlineHandlers(io);

  server.listen(PORT, "0.0.0.0", () => {
    const proto = USE_HTTPS ? "https" : "http";
    console.log(`🚀 Server running on ${proto}://localhost:${PORT}`);
    console.log(`📱 للاختبار مع صديق: ${proto}://YOUR_IP:${PORT} (للمكالمات المرئية يحتاج HTTPS)`);
    console.log(`⚡ Socket.io: فوري`);
  });
};

startServer();
