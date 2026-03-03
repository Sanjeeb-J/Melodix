const jwt = require("jsonwebtoken");

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
    // Attach decoded payload directly — no DB lookup needed.
    // JWT verification (signature check) is sufficient for auth.
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

module.exports = { protect };
