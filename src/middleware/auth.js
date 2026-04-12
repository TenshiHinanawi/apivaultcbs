const jwt = require("jsonwebtoken");
const { config } = require("../config");

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing or invalid authorization token." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = {
      id: Number(payload.sub),
      email: payload.email
    };
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = {
  authRequired
};
