const Conversation = require("./conversation.model");
const User = require("../user/user.model");

const createOrGetConversation = async (req, res) => {
  try {
    const { userId } = req.body; // الشخص التاني

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot start a conversation with yourself",
      });
    }

    // نتأكد إن المستخدم التاني موجود
    const otherUser = await User.findById(userId);

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const me = await User.findById(req.user._id).select("blockedUsers");
    const blocked = (me.blockedUsers || []).map((id) => id.toString());
    if (blocked.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "لا يمكنك بدء محادثة مع مستخدم محظور",
      });
    }

    // نشوف هل المحادثة موجودة بالفعل
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] },
    }).populate("participants", "name phone profileImage isOnline lastSeen");

    if (conversation) {
      return res.status(200).json({
        success: true,
        message: "Conversation already exists",
        conversation,
      });
    }

    // لو مش موجودة ننشئها
    conversation = await Conversation.create({
      type: "direct",
      participants: [req.user._id, userId],
    });

    conversation = await conversation.populate(
      "participants",
      "name phone profileImage isOnline lastSeen"
    );

    res.status(201).json({
      success: true,
      message: "Conversation created successfully",
      conversation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMyConversations = async (req, res) => {
  try {
    let conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name phone profileImage isOnline lastSeen")
      .sort({ updatedAt: -1 })
      .lean();

    const me = await User.findById(req.user._id).select("blockedUsers archivedConversations pinnedConversations mutedConversations");
    const blockedIds = new Set((me.blockedUsers || []).map((id) => id.toString()));
    if (blockedIds.size) {
      conversations = conversations.filter((c) => {
        if (c.type !== "direct" || !c.participants) return true;
        const other = c.participants.find((p) => String(p._id) !== String(req.user._id));
        return !other || !blockedIds.has(String(other._id));
      });
    }

    const archivedSet = new Set((me.archivedConversations || []).map((id) => id.toString()));
    const pinnedSet = new Set((me.pinnedConversations || []).map((id) => id.toString()));
    const mutedMap = new Map();
    (me.mutedConversations || []).forEach((m) => {
      const cid = m.conversation?.toString?.() || String(m.conversation);
      if (cid) mutedMap.set(cid, { mutedUntil: m.mutedUntil });
    });
    conversations = conversations.map((c) => {
      const mid = c._id.toString();
      const muteInfo = mutedMap.get(mid);
      const muted = !!muteInfo;
      const mutedUntil = muteInfo?.mutedUntil;
      const stillMuted = muted && (!mutedUntil || new Date(mutedUntil) > new Date());
      return {
        ...c,
        archived: archivedSet.has(mid),
        pinned: pinnedSet.has(mid),
        muted: stillMuted,
        mutedUntil: mutedUntil || null,
      };
    });

    const includeArchived = req.query.archived === "true";
    let filtered = includeArchived
      ? conversations.filter((c) => c.archived)
      : conversations.filter((c) => !c.archived);

    filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    res.status(200).json({
      success: true,
      conversations: filtered,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * إنشاء مجموعة جديدة
 */
const createGroup = async (req, res) => {
  try {
    const { name, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    const members = memberIds && Array.isArray(memberIds) ? [...memberIds] : [];
    if (!members.includes(req.user._id.toString())) {
      members.unshift(req.user._id.toString());
    }

    const validUsers = await User.find({ _id: { $in: members } }).select("_id");
    const validIds = validUsers.map((u) => u._id);

    if (validIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Group must have at least 2 members",
      });
    }

    const conversation = await Conversation.create({
      type: "group",
      name: name.trim(),
      createdBy: req.user._id,
      participants: validIds,
    });

    const populated = await Conversation.findById(conversation._id)
      .populate("participants", "name phone profileImage isOnline lastSeen")
      .populate("createdBy", "name phone")
      .lean();

    res.status(201).json({
      success: true,
      conversation: populated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * عرض معلومات المجموعة
 */
const getGroupInfo = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findById(id)
      .populate("participants", "name phone profileImage isOnline lastSeen")
      .populate("createdBy", "name phone")
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({
        success: false,
        message: "Not a group conversation",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this group",
      });
    }

    res.status(200).json({
      success: true,
      group: conversation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * إضافة أعضاء للمجموعة (الأدمن فقط)
 */
const addMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({
        success: false,
        message: "Not a group conversation",
      });
    }

    const isAdmin =
      conversation.createdBy &&
      conversation.createdBy.toString() === req.user._id.toString();

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only group admin can add members",
      });
    }

    const idsToAdd = Array.isArray(userIds) ? userIds : [userIds];
    const validUsers = await User.find({ _id: { $in: idsToAdd } }).select("_id");
    const newMembers = validUsers.filter(
      (u) => !conversation.participants.some((p) => p.toString() === u._id.toString())
    );

    if (newMembers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No new valid members to add",
      });
    }

    conversation.participants.push(...newMembers.map((u) => u._id));
    await conversation.save();

    const updated = await Conversation.findById(id)
      .populate("participants", "name phone profileImage isOnline lastSeen")
      .lean();

    res.status(200).json({
      success: true,
      conversation: updated,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * طرد عضو أو مغادرة المجموعة
 */
const removeMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    if (conversation.type !== "group") {
      return res.status(400).json({
        success: false,
        message: "Not a group conversation",
      });
    }

    const targetId = userId || req.user._id.toString();
    const isLeavingSelf = targetId === req.user._id.toString();
    const isAdmin =
      conversation.createdBy &&
      conversation.createdBy.toString() === req.user._id.toString();

    if (!isLeavingSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only admin can remove others",
      });
    }

    conversation.participants = conversation.participants.filter(
      (p) => p.toString() !== targetId
    );
    await conversation.save();

    res.status(200).json({
      success: true,
      message: isLeavingSelf ? "Left group" : "Member removed",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * تحديث خلفية محادثة (تزامن بين الطرفين)
 */
const setConversationBackground = async (req, res) => {
  try {
    const { id } = req.params;
    const { background } = req.body;

    const conversation = await Conversation.findById(id);

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

    // قبول string (ألوان) أو object { type: 'image', url: '...' }
    let newBg = "default";
    if (background === "default" || background === null || background === undefined) {
      newBg = "default";
    } else if (typeof background === "string") {
      newBg = background;
    } else if (background && typeof background === "object" && background.type === "image" && background.url) {
      newBg = { type: "image", url: String(background.url) };
    }

    conversation.background = newBg;
    await conversation.save();

    // إشعار جميع المشاركين بتحديث الخلفية
    const io = req.app.get("io");
    if (io) {
      conversation.participants.forEach((p) => {
        const userId = p.toString();
        io.to(`user:${userId}`).emit("conversation_background_updated", {
          conversationId: id,
          background: newBg,
        });
      });
    }

    res.status(200).json({
      success: true,
      conversation: { _id: conversation._id, background: newBg },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createOrGetConversation,
  getMyConversations,
  createGroup,
  getGroupInfo,
  addMembers,
  removeMember,
  setConversationBackground,
};
