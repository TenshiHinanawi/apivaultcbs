const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { query } = require("../db");
const { config } = require("../config");

const router = express.Router();

const authSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  user_level: z.number().int().min(1).max(10).optional()
});

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

router.post("/register", async (req, res, next) => {
  try {
    const parsed = authSchema.parse(req.body);
    const email = parsed.email.toLowerCase();

    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const userLevel = parsed.user_level ?? 1;

    const result = await query(
      "INSERT INTO users (email, password_hash, user_level) VALUES ($1, $2, $3) RETURNING id, email, user_level, created_at",
      [email, passwordHash, userLevel]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        user_level: user.user_level,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = authSchema.parse(req.body);
    const email = parsed.email.toLowerCase();

    const result = await query(
      "SELECT id, email, password_hash, user_level FROM users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];
    const passwordOk = await bcrypt.compare(parsed.password, user.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        user_level: user.user_level
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
