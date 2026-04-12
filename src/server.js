const { app } = require("./app");
const { config } = require("./config");
const { initDb, close } = require("./db");

async function start() {
  try {
    await initDb();

    const server = app.listen(config.port, () => {
      console.log(`Vault API running on port ${config.port}`);
    });

    const shutdown = (signal) => {
      console.log(`Received ${signal}. Shutting down gracefully.`);
      server.close(async () => {
        await close();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
