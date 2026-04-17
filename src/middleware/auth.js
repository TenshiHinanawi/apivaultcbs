const jwt = require("jsonwebtoken");
const { config } = require("../config");
const { query } = require("../db");

function canAccessResource(userLevel, requiredLevel) {
  if (userLevel > requiredLevel) {
    return true;
  }
  return false;
}

async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid authorization token." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    const result = await query(
      "SELECT id, email, user_level FROM users WHERE id = $1",
      [Number(payload.sub)]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "User not found." });
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      user_level: result.rows[0].user_level || 1
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireLevel(requiredLevel) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!canAccessResource(req.user.user_level, requiredLevel)) {
      return res.status(403).json({
        error: "Insufficient privileges.",
        yourLevel: req.user.user_level,
        requiredLevel: requiredLevel
      });
    }

    next();
  };
}

module.exports = {
  authRequired,
  requireLevel,
  canAccessResource
};
