const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { ZodError } = require("zod");

const { config } = require("./config");
const authRoutes = require("./routes/authRoutes");
const vaultRoutes = require("./routes/vaultRoutes");

const app = express();

const corsOptions =
  config.corsOrigin === "*"
    ? { origin: true }
    : {
        origin: config.corsOrigin
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      };

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("combined"));

app.get("/health", (req, res) => {
  return res.json({
    status: "ok",
    intentionallyVulnerable: "idor"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/vault", vaultRoutes);

app.use((req, res) => {
  return res.status(404).json({ error: "Route not found." });
});

app.use((error, req, res, next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Invalid request payload.",
      details: error.flatten()
    });
  }

  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS policy blocked this origin." });
  }

  console.error(error);
  return res.status(500).json({ error: "Internal server error." });
});

module.exports = {
  app
};
