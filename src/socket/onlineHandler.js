/**
 * معالج حالة الاتصال (متصل الآن / آخر ظهور)
 */

const User = require("../modules/user/user.model");
const Conversation = require("../modules/conversation/conversation.model");

async function getContactUserIds(userId) {
  const convs = await Conversation.find({ participants: userId }).select("participants").lean();
  const ids = new Set();
  convs.forEach((c) => {
    (c.participants || []).forEach((p) => {
      const sid = p && (p._id || p).toString();
      if (sid && sid !== userId) ids.add(sid);
    });
  });
  return Array.from(ids);
}

async function broadcastStatus(io, userId, isOnline, lastSeen) {
  const contactIds = await getContactUserIds(userId);
  contactIds.forEach((targetId) => {
    io.to(`user:${targetId}`).emit("user_status", {
      userId,
      isOnline,
      lastSeen: lastSeen ? lastSeen.toISOString() : null,
    });
  });
}

const setupOnlineHandlers = (io) => {
  io.on("connection", async (socket) => {
    try {
      await User.updateOne({ _id: socket.userId }, { isOnline: true, lastSeen: new Date() });
      await broadcastStatus(io, socket.userId, true, new Date());
    } catch (e) {
      /* ignore */
    }

    socket.on("disconnect", async () => {
      try {
        const now = new Date();
        await User.updateOne({ _id: socket.userId }, { isOnline: false, lastSeen: now });
        await broadcastStatus(io, socket.userId, false, now);
      } catch (e) {
        /* ignore */
      }
    });
  });
};

module.exports = { setupOnlineHandlers };
