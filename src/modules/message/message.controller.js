const Message = require("./message.model");
const Conversation = require("../conversation/conversation.model");
const User = require("../user/user.model");

/**
 * إرسال رسالة نصية
 */
const sendMessage = async (req, res) => {
  try {
    const { conversationId, content, type, replyTo, mediaUrl, pollOptions } = req.body;
    const msgType = type || "text";

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "conversationId is required",
      });
    }

    const isMedia = ["image", "video", "voice", "file", "gif"].includes(msgType);
    const isPoll = msgType === "poll";

    if (!isMedia && !isPoll && !content) {
      return res.status(400).json({
        success: false,
        message: "content is required for text messages",
      });
    }
    if (isMedia && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: "mediaUrl is required for media messages",
      });
    }
    if (isPoll) {
      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: "Poll question (content) is required",
        });
      }
      const opts = Array.isArray(pollOptions) ? pollOptions.filter((o) => o && String(o).trim()) : [];
      if (opts.length < 2 || opts.length > 10) {
        return res.status(400).json({
          success: false,
          message: "Poll must have 2-10 options",
        });
      }
    }

    // التأكد أن المحادثة موجودة والمستخدم مشارك فيها
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this conversation",
      });
    }

    if (isPoll && conversation.type !== "group") {
      return res.status(400).json({
        success: false,
        message: "Polls are only allowed in group conversations",
      });
    }

    const createData = {
      conversation: conversationId,
      sender: req.user._id,
      type: msgType,
      content: (content || "").trim(),
      mediaUrl: mediaUrl || "",
      replyTo: replyTo || null,
    };

    if (isPoll) {
      createData.pollData = { options: opts, votes: [] };
    }

    const message = await Message.create(createData);

    // تحديث lastMessage في المحادثة
    const mediaPreview = {
      image: "📷 صورة",
      video: "🎬 فيديو",
      voice: "🎤 رسالة صوتية",
      file: "📎 ملف",
      gif: "🎞️ GIF",
    };
    const preview =
      isMedia
        ? (content || mediaPreview[msgType] || "")
        : isPoll
          ? "📊 استطلاع"
          : (content.length > 50 ? content.substring(0, 50) + "..." : content);
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: preview,
      updatedAt: new Date(),
    });

    await message.populate("sender", "name profileImage");
    if (replyTo) {
      await message.populate({ path: "replyTo", populate: { path: "sender", select: "name phone" } });
    }

    // إرسال فوري عبر Socket.io للطرف الآخر فقط (المرسل يرى رسالته من الـ response)
    const io = req.app.get("io");
    if (io) {
      const senderId = req.user._id.toString();
      const msgObj = message.toObject ? message.toObject() : message;
      conversation.participants.forEach((p) => {
        const userId = p.toString();
        if (userId !== senderId) {
          io.to(`user:${userId}`).emit("new_message", {
            conversationId: conversationId.toString(),
            message: msgObj,
          });
        }
      });
    }

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * جلب رسائل محادثة (مع pagination)
 */
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before; // للتحميل اللاحق (قبل رسالة معينة)

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "conversationId is required",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this conversation",
      });
    }

    let query = {
      conversation: conversationId,
      deletedFor: { $nin: [req.user._id] },
    };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate("sender", "name profileImage")
      .populate({ path: "replyTo", populate: { path: "sender", select: "name phone" } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // عكس الترتيب ليعرض الأقدم أولاً
    messages.reverse();

    res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * تحديد الرسائل كمقروءة
 */
const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { messageIds } = req.body; // مصفوفة من ids أو آخر رسالة

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this conversation",
      });
    }

    const updateQuery = messageIds?.length
      ? { _id: { $in: messageIds } }
      : { conversation: conversationId, sender: { $ne: req.user._id } };

    const toUpdate = await Message.find({
      ...updateQuery,
      readBy: { $nin: [req.user._id] },
    }).select("_id sender");

    if (toUpdate.length) {
      await Message.updateMany(updateQuery, {
        $addToSet: { readBy: req.user._id },
      });

      const io = req.app.get("io");
      if (io) {
        const ids = toUpdate.map((m) => m._id.toString());
        const readerId = req.user._id.toString();
        const sentTo = new Set();
        toUpdate.forEach((m) => {
          const senderId = m.sender?.toString?.() || String(m.sender);
          if (senderId !== readerId && !sentTo.has(senderId)) {
            sentTo.add(senderId);
            io.to(`user:${senderId}`).emit("messages_read", {
              conversationId,
              messageIds: ids,
              readByUserId: readerId,
            });
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "Marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const REACTIONS = ["❤️", "👍", "😂", "😮", "👎"];

/**
 * إضافة أو تعديل أو إزالة تفاعل
 */
const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId).populate("conversation");

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const conv = message.conversation;
    if (!conv) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conv.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not a participant",
      });
    }

    const userId = req.user._id;
    const existing = message.reactions.find(
      (r) => r.userId.toString() === userId.toString()
    );

    if (emoji && REACTIONS.includes(emoji)) {
      if (existing) {
        existing.emoji = emoji;
      } else {
        message.reactions.push({ emoji, userId });
      }
    } else {
      if (existing) {
        message.reactions = message.reactions.filter(
          (r) => r.userId.toString() !== userId.toString()
        );
      }
    }

    await message.save();

    const io = req.app.get("io");
    if (io) {
      conv.participants.forEach((p) => {
        io.to(`user:${p.toString()}`).emit("message_reaction", {
          messageId: message._id.toString(),
          conversationId: conv._id.toString(),
          reactions: message.reactions,
        });
      });
    }

    res.status(200).json({
      success: true,
      reactions: message.reactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * التصويت على استطلاع
 */
const votePoll = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { optionIndex } = req.body;

    const message = await Message.findById(messageId).populate("conversation");

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.type !== "poll") {
      return res.status(400).json({
        success: false,
        message: "Not a poll message",
      });
    }

    const conv = message.conversation;
    if (!conv) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conv.participants.some(
      (p) => p.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not a participant",
      });
    }

    const pollData = message.pollData || { options: [], votes: [] };
    const idx = parseInt(optionIndex, 10);

    if (isNaN(idx) || idx < 0 || idx >= pollData.options.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid option index",
      });
    }

    const userId = req.user._id;
    const existing = pollData.votes.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (existing) {
      existing.optionIndex = idx;
    } else {
      pollData.votes.push({ optionIndex: idx, userId });
    }

    message.pollData = pollData;
    await message.save();

    const io = req.app.get("io");
    if (io) {
      conv.participants.forEach((p) => {
        io.to(`user:${p.toString()}`).emit("poll_vote", {
          messageId: message._id.toString(),
          conversationId: conv._id.toString(),
          pollData: message.pollData,
        });
      });
    }

    res.status(200).json({
      success: true,
      pollData: message.pollData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * حذف رسالة - من عندي أو للجميع
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { mode } = req.body; // "for_me" | "for_everyone"

    const message = await Message.findById(messageId).populate("conversation");

    if (!message) {
      return res.status(404).json({ success: false, message: "الرسالة غير موجودة" });
    }

    const conv = message.conversation;
    if (!conv || !conv.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: "غير مصرح" });
    }

    const userId = req.user._id.toString();
    const senderId = message.sender?.toString?.() || String(message.sender);

    if (mode === "for_me") {
      await Message.findByIdAndUpdate(messageId, { $addToSet: { deletedFor: req.user._id } });
      return res.status(200).json({ success: true, message: "تم الحذف" });
    }

    if (mode === "for_everyone") {
      if (senderId !== userId) {
        return res.status(403).json({ success: false, message: "يمكنك فقط حذف رسائلك للجميع" });
      }
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(message.createdAt) < hourAgo) {
        return res.status(400).json({
          success: false,
          message: "حذف للجميع متاح خلال ساعة من الإرسال فقط",
        });
      }

      await Message.findByIdAndUpdate(messageId, {
        content: "",
        mediaUrl: "",
        type: "text",
        isDeletedForEveryone: true,
        deletedAt: new Date(),
        $unset: { pollData: 1, replyTo: 1 },
      });
      const updated = await Message.findById(messageId).lean();

      const io = req.app.get("io");
      if (io) {
        conv.participants.forEach((p) => {
          io.to(`user:${p.toString()}`).emit("message_deleted", {
            conversationId: conv._id.toString(),
            messageId: message._id.toString(),
            message: updated,
          });
        });
      }

      return res.status(200).json({ success: true, message: "تم الحذف للجميع" });
    }

    return res.status(400).json({ success: false, message: "حدد mode: for_me أو for_everyone" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * إعادة توجيه رسالة لمحادثة أو محادثات
 */
const forwardMessage = async (req, res) => {
  try {
    const { messageId, targetConversationIds } = req.body;

    if (!messageId || !targetConversationIds || !Array.isArray(targetConversationIds) || targetConversationIds.length === 0) {
      return res.status(400).json({ success: false, message: "messageId و targetConversationIds (مصفوفة) مطلوبان" });
    }

    const original = await Message.findById(messageId)
      .populate("sender", "name phone")
      .populate("conversation");

    if (!original || !original.conversation) {
      return res.status(404).json({ success: false, message: "الرسالة غير موجودة" });
    }

    const isParticipant = original.conversation.participants.some((p) => p.toString() === req.user._id.toString());
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "غير مصرح" });
    }

    if (original.isDeletedForEveryone) {
      return res.status(400).json({ success: false, message: "لا يمكن توجيه رسالة محذوفة" });
    }

    const fromName = original.sender?.name || original.sender?.phone || "مستخدم";
    const io = req.app.get("io");
    const created = [];

    for (const convId of targetConversationIds) {
      const conv = await Conversation.findById(convId);
      if (!conv || !conv.participants.some((p) => p.toString() === req.user._id.toString())) continue;

      const createData = {
        conversation: convId,
        sender: req.user._id,
        type: original.type,
        content: original.content || "",
        mediaUrl: original.mediaUrl || "",
        isForwarded: true,
        forwardedFromName: fromName,
      };

      if (original.type === "poll" && original.pollData?.options?.length) {
        createData.pollData = { options: original.pollData.options, votes: [] };
        createData.content = original.content || "";
      }

      const msg = await Message.create(createData);
      await msg.populate("sender", "name profileImage");

      const mediaPreview = {
        image: "📷 صورة",
        video: "🎬 فيديو",
        voice: "🎤 رسالة صوتية",
        file: "📎 ملف",
        gif: "🎞️ GIF",
      };
      const preview = ["image", "video", "voice", "file", "gif"].includes(original.type)
        ? (original.content || mediaPreview[original.type] || "↳")
        : original.type === "poll"
          ? "📊 استطلاع"
          : (original.content || "").substring(0, 50);
      await Conversation.findByIdAndUpdate(convId, { lastMessage: "↳ " + preview, updatedAt: new Date() });

      if (io) {
        const msgObj = msg.toObject ? msg.toObject() : msg;
        conv.participants.forEach((p) => {
          if (p.toString() !== req.user._id.toString()) {
            io.to(`user:${p.toString()}`).emit("new_message", { conversationId: convId.toString(), message: msgObj });
          }
        });
      }
      created.push(msg);
    }

    res.status(201).json({ success: true, messages: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * البحث في الرسائل
 * GET /api/messages/search?q=...&conversationId=... (conversationId اختياري - للبحث في محادثة واحدة)
 */
const searchMessages = async (req, res) => {
  try {
    const { q, conversationId } = req.query;
    if (!q || !String(q).trim()) {
      return res.json({ success: true, messages: [] });
    }
    const searchRegex = new RegExp(escapeRegex(String(q).trim()), "i");

    let convIds;
    if (conversationId) {
      const conv = await Conversation.findById(conversationId);
      if (!conv || !conv.participants.some((p) => p.toString() === req.user._id.toString())) {
        return res.status(403).json({ success: false, message: "ليس لديك صلاحية" });
      }
      convIds = [conversationId];
    } else {
      const convs = await Conversation.find({ participants: req.user._id }).select("_id").lean();
      convIds = convs.map((c) => c._id);
    }
    if (!convIds.length) return res.json({ success: true, messages: [] });

    const messages = await Message.find({
      conversation: { $in: convIds },
      isDeletedForEveryone: { $ne: true },
      deletedFor: { $nin: [req.user._id] },
      content: searchRegex,
    })
      .populate("sender", "name profileImage")
      .populate({ path: "replyTo", populate: { path: "sender", select: "name phone" } })
      .populate({ path: "conversation", populate: { path: "participants", select: "name phone" } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const allowed = messages.filter(
      (m) =>
        m.conversation &&
        m.conversation.participants?.some((p) => String(p?._id || p) === String(req.user._id))
    );

    res.json({ success: true, messages: allowed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const getStarredMessages = async (req, res) => {
  try {
    const me = await User.findById(req.user._id).select("starredMessages").lean();
    const ids = (me?.starredMessages || []).map((id) => id.toString()).filter(Boolean);
    if (!ids.length) return res.json({ success: true, messages: [] });

    const messages = await Message.find({
      _id: { $in: ids },
      isDeletedForEveryone: { $ne: true },
    })
      .populate("sender", "name profileImage")
      .populate({ path: "replyTo", populate: { path: "sender", select: "name phone" } })
      .populate({ path: "conversation", populate: { path: "participants", select: "name phone" } })
      .sort({ createdAt: -1 })
      .lean();

    const allowed = messages.filter(
      (m) =>
        m.conversation &&
        m.conversation.participants?.some((p) => String(p?._id || p) === String(req.user._id))
    );

    res.json({ success: true, messages: allowed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  searchMessages,
  getStarredMessages,
  markAsRead,
  toggleReaction,
  votePoll,
  deleteMessage,
  forwardMessage,
};
