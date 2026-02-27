const User = require("./user.model");
const Conversation = require("../conversation/conversation.model");
const Message = require("../message/message.model");

const normalizePhone = (p) => String(p || "").replace(/\D/g, "").replace(/^0+/, "").slice(-10);

const checkPhoneRegistered = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, registered: false });
    const normalized = normalizePhone(phone);
    const u = await User.findOne({
      phone: { $regex: new RegExp(normalized + "$"), $options: "i" },
      isBanned: false,
      isDeleted: { $ne: true },
      isApproved: true,
    })
      .select("_id name phone profileImage")
      .lean();
    if (!u) return res.json({ success: true, registered: false });
    const me = await User.findById(req.user._id).select("blockedUsers");
    const blocked = [...(me.blockedUsers || [])].map((id) => id.toString());
    if (blocked.includes(u._id.toString())) return res.json({ success: true, registered: false });
    res.json({ success: true, registered: true, user: u });
  } catch (err) {
    res.status(500).json({ success: false, registered: false, message: err.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { phone } = req.query;
    const me = await User.findById(req.user._id).select("blockedUsers");
    const blockedIds = [...(me.blockedUsers || [])];
    const blockedByMe = blockedIds.map((id) => id.toString());

    const usersBlockedMe = await User.find({ blockedUsers: req.user._id }).select("_id").lean();
    const blockedByThem = usersBlockedMe.map((u) => u._id.toString());

    const excludeIds = [...new Set([...blockedByMe, ...blockedByThem])];

    const filter = {
      _id: { $ne: req.user._id, $nin: excludeIds },
      isBanned: false,
      isDeleted: { $ne: true },
      isApproved: true,
    };
    if (phone) filter.phone = { $regex: phone, $options: "i" };

    const users = await User.find(filter)
      .select("name phone profileImage _id")
      .limit(20)
      .lean();

    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, profileImage, about } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) user.name = name;
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (about !== undefined) user.about = about;
    if (req.body.themePreference && ["light", "dark", "system"].includes(req.body.themePreference)) {
      user.themePreference = req.body.themePreference;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "لا يمكنك حظر نفسك" });
    }
    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    }
    const user = await User.findById(req.user._id);
    if (!user.blockedUsers) user.blockedUsers = [];
    const idStr = target._id.toString();
    if (user.blockedUsers.some((id) => id.toString() === idStr)) {
      return res.status(400).json({ success: false, message: "المستخدم محظور بالفعل" });
    }
    user.blockedUsers.push(target._id);
    await user.save();
    res.json({ success: true, message: "تم الحظر" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user.blockedUsers) user.blockedUsers = [];
    user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== userId);
    await user.save();
    res.json({ success: true, message: "تم إلغاء الحظر" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBlockedList = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("blockedUsers", "name phone profileImage _id")
      .lean();
    const list = (user.blockedUsers || []).map((u) => (u && u._id ? u : null)).filter(Boolean);
    res.json({ success: true, blocked: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleArchiveConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.status(404).json({ success: false, message: "المحادثة غير موجودة" });
    }
    const user = await User.findById(req.user._id);
    if (!user.archivedConversations) user.archivedConversations = [];
    const idStr = conversationId.toString();
    const idx = user.archivedConversations.findIndex((id) => id.toString() === idStr);
    if (idx >= 0) {
      user.archivedConversations.splice(idx, 1);
    } else {
      user.archivedConversations.push(conversationId);
    }
    await user.save();
    res.json({
      success: true,
      archived: user.archivedConversations.map((id) => id.toString()),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleStarMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ success: false, message: "الرسالة غير موجودة" });
    const conv = await Conversation.findById(msg.conversation);
    if (!conv || !conv.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ success: false, message: "ليس لديك صلاحية الوصول لهذه المحادثة" });
    }
    const user = await User.findById(req.user._id);
    if (!user.starredMessages) user.starredMessages = [];
    const idx = user.starredMessages.findIndex((id) => id.toString() === messageId);
    if (idx >= 0) {
      user.starredMessages.splice(idx, 1);
    } else {
      user.starredMessages.push(messageId);
    }
    await user.save();
    res.json({ success: true, starred: user.starredMessages.map((id) => id.toString()), isStarred: idx < 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStarredIds = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("starredMessages").lean();
    const ids = (user?.starredMessages || []).map((id) => id.toString());
    res.json({ ids });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleMuteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { duration } = req.body || {};
    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.status(404).json({ success: false, message: "المحادثة غير موجودة" });
    }
    const user = await User.findById(req.user._id);
    if (!user.mutedConversations) user.mutedConversations = [];
    const idx = user.mutedConversations.findIndex((m) => m.conversation?.toString() === conversationId);
    if (idx >= 0) {
      user.mutedConversations.splice(idx, 1);
      await user.save();
      return res.json({ success: true, muted: false });
    }
    let mutedUntil = null;
    if (duration === "8h") mutedUntil = new Date(Date.now() + 8 * 60 * 60 * 1000);
    else if (duration === "1week") mutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.mutedConversations.push({ conversation: conversationId, mutedUntil });
    await user.save();
    res.json({ success: true, muted: true, mutedUntil: mutedUntil?.toISOString?.() || null });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    user.isDeleted = true;
    user.isApproved = false;
    user.name = "New User";
    user.profileImage = "";
    user.about = "Hey there! I am using WhatsApp Clone.";
    await user.save();
    res.json({ success: true, message: "تم حذف الحساب. يمكنك التسجيل مرة أخرى بانتظار الموافقة." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const togglePinConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.status(404).json({ success: false, message: "المحادثة غير موجودة" });
    }
    const user = await User.findById(req.user._id);
    if (!user.pinnedConversations) user.pinnedConversations = [];
    const idStr = conversationId.toString();
    const idx = user.pinnedConversations.findIndex((id) => id.toString() === idStr);
    if (idx >= 0) {
      user.pinnedConversations.splice(idx, 1);
    } else {
      user.pinnedConversations.push(conversationId);
    }
    await user.save();
    res.json({
      success: true,
      pinned: user.pinnedConversations.map((id) => id.toString()),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  checkPhoneRegistered,
  searchUsers,
  updateProfile,
  blockUser,
  unblockUser,
  getBlockedList,
  deleteAccount,
  togglePinConversation,
  toggleArchiveConversation,
  toggleStarMessage,
  getStarredIds,
  toggleMuteConversation,
};
