const Story = require("./story.model");
const Conversation = require("../conversation/conversation.model");
const User = require("../user/user.model");

const STORY_EXPIRY_HOURS = 24;

/**
 * نشر قصة جديدة
 */
const createStory = async (req, res) => {
  try {
    const { type, content, mediaUrl } = req.body;
    const storyType = type || "text";

    if (!["text", "image", "video"].includes(storyType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid story type",
      });
    }

    if (storyType === "text" && !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Content is required for text stories",
      });
    }

    if ((storyType === "image" || storyType === "video") && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: "mediaUrl is required for media stories",
      });
    }

    const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 60 * 60 * 1000);

    const story = await Story.create({
      user: req.user._id,
      type: storyType,
      content: (content || "").trim(),
      mediaUrl: mediaUrl || "",
      expiresAt,
    });

    await story.populate("user", "name profileImage");

    res.status(201).json({
      success: true,
      story,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * جلب القصص من جهات الاتصال (مستخدمين لديك محادثة معهم + قصصك)
 */
const getStories = async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id })
      .select("participants")
      .lean();

    const contactIds = new Set();
    convs.forEach((c) => {
      (c.participants || []).forEach((p) => {
        const id = p.toString ? p.toString() : p;
        if (id !== req.user._id.toString()) contactIds.add(id);
      });
    });
    contactIds.add(req.user._id.toString());

    const now = new Date();
    const stories = await Story.find({
      user: { $in: Array.from(contactIds) },
      expiresAt: { $gt: now },
    })
      .populate("user", "name profileImage")
      .sort({ createdAt: -1 })
      .lean();

    // تجميع حسب المستخدم
    const byUser = {};
    stories.forEach((s) => {
      const uid = s.user._id.toString();
      if (!byUser[uid]) {
        byUser[uid] = { user: s.user, stories: [] };
      }
      byUser[uid].stories.push(s);
    });

    const result = Object.values(byUser).map((g) => ({
      user: g.user,
      stories: g.stories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      latestAt: g.stories[0]?.createdAt,
    }));

    result.sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));

    res.status(200).json({
      success: true,
      stories: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * حذف قصة (صاحب القصة فقط)
 */
const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;

    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own stories",
      });
    }

    await Story.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Story deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createStory,
  getStories,
  deleteStory,
};
