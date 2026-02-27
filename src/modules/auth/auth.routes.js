const express = require("express");
const router = express.Router();

const { login } = require("./auth.controller");
const protect = require("../../middleware/auth.middleware");
const { isAdmin } = require("./auth.service");

router.post("/login", login);

router.get("/me", protect, (req, res) => {
  const u = req.user.toObject ? req.user.toObject() : { ...req.user };
  u.isAdmin = isAdmin(req.user);
  res.status(200).json({
    success: true,
    user: u,
  });
});

module.exports = router;
