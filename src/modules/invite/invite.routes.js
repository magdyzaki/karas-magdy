const express = require("express");
const router = express.Router();
const protect = require("../../middleware/auth.middleware");
const { createInvite, getMyInvites, verifyInvite } = require("./invite.controller");

router.get("/verify/:token", verifyInvite);
router.use(protect);
router.post("/", createInvite);
router.get("/", getMyInvites);

module.exports = router;
