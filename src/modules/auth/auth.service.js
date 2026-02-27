const jwt = require("jsonwebtoken");
const User = require("../user/user.model");
const Invite = require("../invite/invite.model");

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      phone: user.phone,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const getAdminIds = () => {
  const ids = (process.env.ADMIN_USER_IDS || "").trim().split(/[,،\s]+/).filter(Boolean);
  return ids;
};

const getAdminPhones = () => {
  const phones = (process.env.ADMIN_PHONES || "").trim().split(/[,،\s]+/).filter(Boolean);
  return phones;
};

const isAdmin = (user) => {
  const adminIds = getAdminIds();
  const adminPhones = getAdminPhones();
  const id = user._id?.toString?.() || user;
  const phone = user.phone || "";
  return adminIds.includes(id) || adminPhones.includes(phone);
};

const approvalMode = () => process.env.APPROVAL_MODE === "true" || process.env.APPROVAL_MODE === "1";

const loginWithPhone = async (phone, inviteToken) => {
  if (!phone) {
    throw new Error("Phone number is required");
  }

  let user = await User.findOne({ phone });

  if (!user) {
    const isApproved = !approvalMode();
    user = await User.create({ phone, isApproved });

    if (inviteToken) {
      const invite = await Invite.findOne({
        token: inviteToken,
        usedBy: null,
        expiresAt: { $gt: new Date() },
      });
      if (invite) {
        invite.usedBy = user._id;
        invite.usedAt = new Date();
        await invite.save();
      }
    }
  } else if (user.isDeleted) {
    user.isDeleted = false;
    user.isApproved = !approvalMode();
    user.name = "New User";
    user.profileImage = "";
    user.about = "Hey there! I am using WhatsApp Clone.";
    await user.save();
    if (inviteToken) {
      const invite = await Invite.findOne({
        token: inviteToken,
        usedBy: null,
        expiresAt: { $gt: new Date() },
      });
      if (invite) {
        invite.usedBy = user._id;
        invite.usedAt = new Date();
        await invite.save();
      }
    }
  }

  if (user.isBanned) {
    throw new Error("تم حظر حسابك");
  }

  if (!user.isApproved && !isAdmin(user)) {
    const err = new Error("حسابك بانتظار الموافقة من الأدمن");
    err.needsApproval = true;
    throw err;
  }

  const token = generateToken(user);
  const userObj = user.toObject ? user.toObject() : user;
  userObj.isAdmin = isAdmin(user);

  return {
    user: userObj,
    token,
  };
};

module.exports = {
  loginWithPhone,
  isAdmin,
  getAdminIds,
  getAdminPhones,
};
