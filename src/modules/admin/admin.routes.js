const express = require("express");
const router = express.Router();
const protect = require("../../middleware/auth.middleware");
const requireAdmin = require("../../middleware/admin.middleware");
const {
  getPendingUsers,
  approveUser,
  banUser,
  unbanUser,
  getAllUsers,
} = require("./admin.controller");

router.use(protect);
router.use(requireAdmin);

router.get("/pending", getPendingUsers);
router.get("/users", getAllUsers);
router.post("/approve/:userId", approveUser);
router.post("/ban/:userId", banUser);
router.post("/unban/:userId", unbanUser);

module.exports = router;
