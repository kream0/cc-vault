#!/usr/bin/env bun

/**
 * Build script for Claude Restore UI
 *
 * Creates a single executable binary that includes the server and public assets.
 *
 * Usage:
 *   bun run scripts/build.ts
 *   # or
 *   bun run build
 */

import { $ } from "bun";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const projectRoot = join(import.meta.dir, "..");
const distDir = join(projectRoot, "dist");

// Ensure dist directory exists
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

console.log("Building Claude Restore UI...");

try {
  // Build the single binary
  await $`bun build --compile --outfile=${join(distDir, "claude-restore")} ${join(projectRoot, "src/index.ts")}`;

  console.log("\nBuild successful!");
  console.log(`\nOutput: ${join(distDir, "claude-restore")}`);
  console.log("\nUsage:");
  console.log("  ./dist/claude-restore                           # Start on default port 3000");
  console.log("  ./dist/claude-restore --port 8080                # Custom port");
  console.log("  ./dist/claude-restore --claude-root /path/to/.claude  # Custom Claude directory");
} catch (error) {
  console.error("Build failed:", error);
  process.exit(1);
}
