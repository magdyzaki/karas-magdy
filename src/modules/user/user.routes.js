const express = require("express");
const router = express.Router();

const protect = require("../../middleware/auth.middleware");
const {
  checkPhoneRegistered,
  searchUsers,
  getMe,
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
} = require("./user.controller");

router.get("/me", protect, getMe);
router.get("/check-phone", protect, checkPhoneRegistered);
router.get("/search", protect, searchUsers);
router.put("/profile", protect, updateProfile);
router.get("/starred-ids", protect, getStarredIds);
router.post("/star/:messageId", protect, toggleStarMessage);
router.post("/pin/:conversationId", protect, togglePinConversation);
router.post("/mute/:conversationId", protect, toggleMuteConversation);
router.post("/archive/:conversationId", protect, toggleArchiveConversation);
router.get("/blocked", protect, getBlockedList);
router.post("/block/:userId", protect, blockUser);
router.post("/delete-account", protect, deleteAccount);
router.post("/unblock/:userId", protect, unblockUser);

module.exports = router;
