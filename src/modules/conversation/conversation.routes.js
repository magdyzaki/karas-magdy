const express = require("express");
const router = express.Router();
const protect = require("../../middleware/auth.middleware");
const {
  createOrGetConversation,
  getMyConversations,
  createGroup,
  getGroupInfo,
  addMembers,
  removeMember,
} = require("./conversation.controller");

router.use(protect);

router.post("/", createOrGetConversation);
router.post("/group", createGroup);
router.get("/", getMyConversations);
router.get("/:id/info", getGroupInfo);
router.put("/:id/members", addMembers);
router.delete("/:id/members", removeMember);

module.exports = router;
