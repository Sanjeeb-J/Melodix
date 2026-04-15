const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // Check Authorization header first (standard API calls)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }
  // Fallback: check query param (used by <audio src> streaming)
  else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "melodix_super_secret_2026");
    
    // Attempt to load the user, but don't fail if the database is down
    try {
      const user = await User.findById(decoded.id).select("-password");
      req.user = user || { _id: decoded.id, id: decoded.id };
    } catch (dbError) {
      console.warn("[Auth] Database error during user lookup - proceeding with token data only.");
      // Preserve the authenticated user id so playlist ownership stays scoped
      // even if the user document lookup fails temporarily.
      req.user = { _id: decoded.id, id: decoded.id, name: "Guest User" };
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protect };
