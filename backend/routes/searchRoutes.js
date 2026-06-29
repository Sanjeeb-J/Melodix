const express = require("express");
const { logSearch, getRecentSearches, clearRecentSearches } = require("../controllers/searchController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/log", protect, logSearch);
router.get("/recent", protect, getRecentSearches);
router.delete("/recent", protect, clearRecentSearches);

module.exports = router;
