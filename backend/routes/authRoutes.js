const express = require("express");
const { registerUser, loginUser, forgotPassword, getUserProfile, updateUserProfile, deleteUser } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);

router.get("/me", protect, getUserProfile);
router.put("/update", protect, updateUserProfile);
router.delete("/delete", protect, deleteUser);

module.exports = router;
