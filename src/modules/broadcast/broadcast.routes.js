const express = require("express");
const router = express.Router();
const protect = require("../../middleware/auth.middleware");
const {
  createBroadcast,
  getMyBroadcasts,
  updateBroadcast,
  deleteBroadcast,
  sendToBroadcast,
} = require("./broadcast.controller");

router.use(protect);

router.post("/", createBroadcast);
router.get("/", getMyBroadcasts);
router.put("/:id", updateBroadcast);
router.delete("/:id", deleteBroadcast);
router.post("/:id/send", sendToBroadcast);

module.exports = router;
