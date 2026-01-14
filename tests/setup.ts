import { join } from "path";
import { mkdirSync, rmSync, existsSync } from "fs";

// Test fixture paths - NEVER use real ~/.claude
export const TEST_FIXTURES_ROOT = join(import.meta.dir, "fixtures");
export const TEST_PROJECTS_ROOT = join(TEST_FIXTURES_ROOT, "projects");
export const TEST_HISTORY_ROOT = join(TEST_FIXTURES_ROOT, "file-history");

// Temporary directory for restore output (isolated from everything else)
export const TEST_OUTPUT_ROOT = join(import.meta.dir, ".test-output");

// Helper to create test config
export function createTestConfig() {
  return {
    claudeRoot: TEST_FIXTURES_ROOT,
    projectsRoot: TEST_PROJECTS_ROOT,
    historyRoot: TEST_HISTORY_ROOT,
    port: 0, // Random available port
  };
}

// Setup test output directory
export function setupTestOutput() {
  if (existsSync(TEST_OUTPUT_ROOT)) {
    rmSync(TEST_OUTPUT_ROOT, { recursive: true, force: true });
  }
  mkdirSync(TEST_OUTPUT_ROOT, { recursive: true });
}

// Cleanup test output directory
export function cleanupTestOutput() {
  if (existsSync(TEST_OUTPUT_ROOT)) {
    rmSync(TEST_OUTPUT_ROOT, { recursive: true, force: true });
  }
}
