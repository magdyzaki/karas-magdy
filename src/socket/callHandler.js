/**
 * معالج إشارات المكالمات عبر Socket.io
 * يستخدم للتنسيق بين الطرفين فقط — الوسائط تذهب عبر WebRTC مباشرة
 */

const User = require("../modules/user/user.model");

const setupCallHandlers = (io) => {
  io.on("connection", (socket) => {
    // طلب مكالمة جديدة
    socket.on("call_request", async ({ targetUserId, video }) => {
      try {
        const target = String(targetUserId || "").trim();
        if (!target || target === socket.userId) {
          socket.emit("call_error", { message: "لا يمكنك الاتصال بنفسك" });
          return;
        }
        const from = await User.findById(socket.userId).select("name");
        const callId = `${socket.userId}-${target}-${Date.now()}`;
        socket.callId = callId;
        socket.callTarget = target;
        io.to(`user:${target}`).emit("incoming_call", {
          callId,
          fromUserId: socket.userId,
          fromName: from?.name || "مستخدم",
          video: !!video,
        });
      } catch (e) {
        socket.emit("call_error", { message: e.message });
      }
    });

    // إجابة على المكالمة
    socket.on("call_accept", ({ callId, fromUserId }) => {
      io.to(`user:${fromUserId}`).emit("call_accepted", {
        callId,
        calleeUserId: socket.userId,
      });
    });

    // رفض المكالمة
    socket.on("call_reject", ({ callId, fromUserId }) => {
      io.to(`user:${fromUserId}`).emit("call_rejected", {
        callId,
        calleeUserId: socket.userId,
      });
    });

    // إنهاء المكالمة
    socket.on("call_end", ({ callId, targetUserId }) => {
      io.to(`user:${targetUserId}`).emit("call_ended", { callId });
    });

    // إشارات WebRTC
    socket.on("webrtc_offer", ({ toUserId, offer }) => {
      io.to(`user:${toUserId}`).emit("webrtc_offer", {
        fromUserId: socket.userId,
        offer,
      });
    });

    socket.on("webrtc_answer", ({ toUserId, answer }) => {
      io.to(`user:${toUserId}`).emit("webrtc_answer", {
        fromUserId: socket.userId,
        answer,
      });
    });

    socket.on("ice_candidate", ({ toUserId, candidate }) => {
      io.to(`user:${toUserId}`).emit("ice_candidate", {
        fromUserId: socket.userId,
        candidate,
      });
    });
  });
};

module.exports = { setupCallHandlers };
