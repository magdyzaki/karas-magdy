const express = require("express");
const router = express.Router();
const protect = require("../../middleware/auth.middleware");
const { createStory, getStories, deleteStory } = require("./story.controller");

router.use(protect);

router.post("/", createStory);
router.get("/", getStories);
router.delete("/:id", deleteStory);

module.exports = router;
