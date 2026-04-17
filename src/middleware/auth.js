const jwt = require("jsonwebtoken");
const { config } = require("../config");
const { query } = require("../db");

function canAccessAdmin(user) {
  if (user.user_level < 5) return false;
  if (user.user_level === 5 && !user.isAdmin) return false;
  return true;
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
      "SELECT id, email, user_level, is_admin FROM users WHERE id = $1",
      [Number(payload.sub)]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "User not found." });
    }

    req.user = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      user_level: result.rows[0].user_level || 1,
      isAdmin: result.rows[0].is_admin
    };

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

function requireAdmin() {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!canAccessAdmin(req.user)) {
      return res.status(403).json({
        error: "Insufficient privileges.",
        yourLevel: req.user.user_level
      });
    }

    next();
  };
}

module.exports = { authRequired, requireAdmin, canAccessAdmin };
