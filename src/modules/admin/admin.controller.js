const User = require("../user/user.model");

const getPendingUsers = async (req, res) => {
  const users = await User.find({ isApproved: false, isBanned: false })
    .select("_id phone name profileImage createdAt")
    .sort({ createdAt: -1 });
  res.json({ success: true, users });
};

const approveUser = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
  }
  user.isApproved = true;
  await user.save();
  res.json({ success: true, message: "تمت الموافقة", user });
};

const banUser = async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: "لا يمكنك حظر نفسك" });
  }
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
  }
  user.isBanned = true;
  await user.save();
  res.json({ success: true, message: "تم الحظر", user });
};

const unbanUser = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
  }
  user.isBanned = false;
  await user.save();
  res.json({ success: true, message: "تم إلغاء الحظر", user });
};

const getAllUsers = async (req, res) => {
  const users = await User.find()
    .select("_id phone name profileImage isApproved isBanned createdAt")
    .sort({ createdAt: -1 });
  res.json({ success: true, users });
};

module.exports = {
  getPendingUsers,
  approveUser,
  banUser,
  unbanUser,
  getAllUsers,
};
