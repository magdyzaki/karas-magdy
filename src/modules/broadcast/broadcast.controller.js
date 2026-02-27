const Broadcast = require("./broadcast.model");
const Message = require("../message/message.model");
const Conversation = require("../conversation/conversation.model");
const User = require("../user/user.model");

/**
 * إنشاء قائمة بث
 */
const createBroadcast = async (req, res) => {
  try {
    const { name, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const ids = Array.isArray(memberIds) ? memberIds : [];
    const validUsers = await User.find({ _id: { $in: ids } }).select("_id");
    const validIds = validUsers.map((u) => u._id);

    const broadcast = await Broadcast.create({
      name: name.trim(),
      createdBy: req.user._id,
      members: validIds,
    });

    const populated = await Broadcast.findById(broadcast._id)
      .populate("members", "name phone profileImage")
      .populate("createdBy", "name phone")
      .lean();

    res.status(201).json({
      success: true,
      broadcast: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * جلب قوائم البث الخاصة بالمستخدم
 */
const getMyBroadcasts = async (req, res) => {
  try {
    const broadcasts = await Broadcast.find({ createdBy: req.user._id })
      .populate("members", "name phone profileImage")
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      broadcasts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * تحديث قائمة بث
 */
const updateBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, memberIds } = req.body;

    const broadcast = await Broadcast.findById(id);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: "Broadcast not found",
      });
    }

    if (broadcast.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not your broadcast list",
      });
    }

    if (name && name.trim()) broadcast.name = name.trim();
    if (Array.isArray(memberIds)) {
      const validUsers = await User.find({ _id: { $in: memberIds } }).select("_id");
      broadcast.members = validUsers.map((u) => u._id);
    }

    await broadcast.save();

    const populated = await Broadcast.findById(id)
      .populate("members", "name phone profileImage")
      .lean();

    res.status(200).json({
      success: true,
      broadcast: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * حذف قائمة بث
 */
const deleteBroadcast = async (req, res) => {
  try {
    const { id } = req.params;

    const broadcast = await Broadcast.findById(id);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: "Broadcast not found",
      });
    }

    if (broadcast.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not your broadcast list",
      });
    }

    await Broadcast.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Broadcast deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * إرسال رسالة لقائمة بث
 * ينشئ رسالة في محادثة كل عضو مع المرسل
 */
const sendToBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, type, mediaUrl } = req.body;

    const broadcast = await Broadcast.findById(id)
      .populate("members", "_id")
      .populate("createdBy");

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: "Broadcast not found",
      });
    }

    if (broadcast.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not your broadcast list",
      });
    }

    const msgType = type || "text";
    const isMedia = ["image", "video", "voice", "file"].includes(msgType);

    if (!isMedia && !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Content is required for text messages",
      });
    }
    if (isMedia && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: "mediaUrl is required for media messages",
      });
    }

    const io = req.app.get("io");
    let sentCount = 0;

    for (const member of broadcast.members) {
      const memberId = member._id.toString();
      if (memberId === req.user._id.toString()) continue;

      let conv = await Conversation.findOne({
        type: "direct",
        participants: { $all: [req.user._id, memberId] },
      });

      if (!conv) {
        conv = await Conversation.create({
          type: "direct",
          participants: [req.user._id, memberId],
        });
      }

      const message = await Message.create({
        conversation: conv._id,
        sender: req.user._id,
        type: msgType,
        content: (content || "").trim(),
        mediaUrl: mediaUrl || "",
      });

      await message.populate("sender", "name profileImage");

      const preview =
        content && content.length > 50 ? content.substring(0, 50) + "..." : content || "";
      await Conversation.findByIdAndUpdate(conv._id, {
        lastMessage: preview,
        updatedAt: new Date(),
      });

      if (io) {
        io.to(`user:${memberId}`).emit("new_message", {
          conversationId: conv._id.toString(),
          message: message.toObject ? message.toObject() : message,
        });
      }
      sentCount++;
    }

    res.status(200).json({
      success: true,
      message: `Sent to ${sentCount} recipients`,
      sentCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createBroadcast,
  getMyBroadcasts,
  updateBroadcast,
  deleteBroadcast,
  sendToBroadcast,
};
