const Invite = require("./invite.model");
const User = require("../user/user.model");
const { isAdmin } = require("../auth/auth.service");

const DEFAULT_EXPIRY_DAYS = 7;

/**
 * إنشاء رابط دعوة جديد (الأدمن فقط)
 */
const createInvite = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "صلاحية الأدمن مطلوبة لإنشاء روابط الدعوة" });
    }
    const { expiresInDays } = req.body;
    const days = expiresInDays ? parseInt(expiresInDays, 10) : DEFAULT_EXPIRY_DAYS;
    const expiresAt = new Date(Date.now() + Math.min(days, 30) * 24 * 60 * 60 * 1000);

    const invite = await Invite.create({
      createdBy: req.user._id,
      expiresAt,
    });

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";
    const url = `${baseUrl}/invite.html?token=${invite.token}`;

    res.status(201).json({
      success: true,
      invite: {
        _id: invite._id,
        token: invite.token,
        url,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * جلب روابط الدعوة (الأدمن فقط)
 */
const getMyInvites = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({ success: false, message: "صلاحية الأدمن مطلوبة" });
    }
    const invites = await Invite.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const baseUrl = process.env.BASE_URL || "http://localhost:5000";

    const result = invites.map((inv) => ({
      ...inv,
      url: `${baseUrl}/invite.html?token=${inv.token}`,
    }));

    res.status(200).json({
      success: true,
      invites: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * التحقق من صحة الرابط (بدون تسجيل دخول)
 */
const verifyInvite = async (req, res) => {
  try {
    const { token } = req.params;

    const invite = await Invite.findOne({ token });

    if (!invite) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: "رابط الدعوة غير موجود",
      });
    }

    if (invite.usedBy) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "تم استخدام هذا الرابط مسبقاً",
      });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "انتهت صلاحية الرابط",
      });
    }

    const inviter = await User.findById(invite.createdBy).select("name");
    res.status(200).json({
      success: true,
      valid: true,
      inviterName: inviter?.name || "مستخدم",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      valid: false,
      message: error.message,
    });
  }
};

module.exports = {
  createInvite,
  getMyInvites,
  verifyInvite,
};
