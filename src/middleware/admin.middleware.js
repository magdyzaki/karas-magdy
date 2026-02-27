const { isAdmin } = require("../modules/auth/auth.service");

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "يجب تسجيل الدخول" });
  }
  if (!isAdmin(req.user)) {
    return res.status(403).json({ success: false, message: "صلاحيات الأدمن مطلوبة" });
  }
  next();
};

module.exports = requireAdmin;
