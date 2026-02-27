const express = require("express");
const router = express.Router();
const protect = require("../../middleware/auth.middleware");
const { sendMessage, getMessages, searchMessages, getStarredMessages, markAsRead, toggleReaction, votePoll, deleteMessage, forwardMessage } = require("./message.controller");

router.use(protect);

router.get("/search", searchMessages);
router.get("/starred", getStarredMessages);
router.post("/", sendMessage);
router.post("/forward", forwardMessage);
router.put("/reaction/:messageId", toggleReaction);
router.put("/:messageId/delete", deleteMessage);
router.post("/poll/:messageId/vote", votePoll);
router.get("/:conversationId", getMessages);
router.post("/:conversationId/read", markAsRead);

module.exports = router;
