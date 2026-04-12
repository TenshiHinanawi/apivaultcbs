const dotenv = require("dotenv");

dotenv.config();

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number.parseInt(process.env.PORT || "4000", 10),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  corsOrigin: process.env.CORS_ORIGIN || "*"
};

if (!config.databaseUrl) {
  throw new Error("Missing DATABASE_URL environment variable.");
}

if (!config.jwtSecret) {
  throw new Error("Missing JWT_SECRET environment variable.");
}

if (!Number.isFinite(config.port)) {
  throw new Error("PORT must be a valid number.");
}

module.exports = {
  config
};
