const express = require("express");
const router = express.Router();
const protect = require("../middleware/auth.middleware");
const User = require("../modules/user/user.model");
const Conversation = require("../modules/conversation/conversation.model");
const Message = require("../modules/message/message.model");
const Story = require("../modules/story/story.model");
const Broadcast = require("../modules/broadcast/broadcast.model");

router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).select("-blockedUsers -__v").lean();
    const conversations = await Conversation.find({
      participants: userId,
      type: { $in: ["direct", "group"] },
    })
      .populate("participants", "name phone profileImage")
      .populate("createdBy", "name phone")
      .lean();
    const convIds = conversations.map((c) => c._id);
    const messages = await Message.find({ conversation: { $in: convIds } })
      .populate("sender", "name phone")
      .sort({ createdAt: 1 })
      .lean();
    const stories = await Story.find({ user: userId }).lean();
    const broadcasts = await Broadcast.find({ createdBy: userId })
      .populate("members", "name phone")
      .lean();

    const backup = {
      exportedAt: new Date().toISOString(),
      user,
      conversations,
      messages,
      stories,
      broadcasts,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="karas-backup-${Date.now()}.json"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
