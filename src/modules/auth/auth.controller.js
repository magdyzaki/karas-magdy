const { loginWithPhone } = require("./auth.service");

const login = async (req, res) => {
  try {
    const { phone, inviteToken } = req.body;

    const data = await loginWithPhone(phone, inviteToken);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
      needsApproval: error.needsApproval,
    });
  }
};

module.exports = {
  login,
};
