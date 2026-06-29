const express = require("express");
const { logPlay, getHistory, getHistoryStats } = require("../controllers/historyController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, logPlay);
router.get("/", protect, getHistory);
router.get("/stats", protect, getHistoryStats);

module.exports = router;
