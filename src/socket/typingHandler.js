/**
 * معالج مؤشر الكتابة - يبث "يكتب..." للمشاركين في المحادثة
 */

const User = require("../modules/user/user.model");

const setupTypingHandlers = (io) => {
  io.on("connection", (socket) => {
    socket.on("join_conversation", ({ conversationId }) => {
      if (conversationId) socket.join(`conv:${conversationId}`);
    });

    socket.on("leave_conversation", ({ conversationId }) => {
      if (conversationId) socket.leave(`conv:${conversationId}`);
    });

    socket.on("typing", async ({ conversationId }) => {
      if (!conversationId) return;
      try {
        const u = await User.findById(socket.userId).select("name");
        socket.to(`conv:${conversationId}`).emit("user_typing", {
          conversationId,
          userId: socket.userId,
          userName: u?.name || "مستخدم",
        });
      } catch (e) {
        /* ignore */
      }
    });

    socket.on("typing_stop", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit("user_stopped_typing", {
        conversationId,
        userId: socket.userId,
      });
    });
  });
};

module.exports = { setupTypingHandlers };
