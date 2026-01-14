import { getConfig } from "./config";
import { createServer } from "./server";

const config = getConfig();
const server = createServer(config);

console.log(`Claude Restore UI listening on http://localhost:${server.port}`);
console.log(`Using Claude root: ${config.claudeRoot}`);

// Graceful shutdown handler
function shutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down gracefully...`);
  server.stop(true); // true = close all connections immediately
  process.exit(0);
}

// Handle termination signals
process.on("SIGINT", () => shutdown("SIGINT"));   // Ctrl+C
process.on("SIGTERM", () => shutdown("SIGTERM")); // kill command
process.on("SIGHUP", () => shutdown("SIGHUP"));   // terminal closed

// Handle uncaught errors to ensure cleanup
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  server.stop(true);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  server.stop(true);
  process.exit(1);
});
