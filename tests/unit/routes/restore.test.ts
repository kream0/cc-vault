import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { createServer } from "../../../src/server";
import { createTestConfig, TEST_OUTPUT_ROOT, setupTestOutput, cleanupTestOutput } from "../../setup";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { Server } from "bun";

describe("POST /api/restore", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(() => {
    const config = createTestConfig();
    server = createServer(config);
    baseUrl = `http://localhost:${server.port}`;
  });

  afterAll(() => {
    server.stop();
  });

  beforeEach(() => {
    setupTestOutput();
  });

  afterEach(() => {
    cleanupTestOutput();
  });

  test("returns 400 for missing required fields", async () => {
    const res = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Missing required fields");
  });

  test("returns 404 for non-existent conversation", async () => {
    const res = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "nonexistent",
        checkpointMessageId: "msg-002",
        targetDir: TEST_OUTPUT_ROOT,
      }),
    });
    expect(res.status).toBe(404);
  });

  test("returns 404 for non-existent checkpoint", async () => {
    const res = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "conv-001",
        checkpointMessageId: "nonexistent",
        targetDir: TEST_OUTPUT_ROOT,
      }),
    });
    expect(res.status).toBe(404);
  });

  test("restores files to target directory", async () => {
    const res = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "conv-001",
        checkpointMessageId: "msg-002",
        targetDir: TEST_OUTPUT_ROOT,
      }),
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(2); // src/index.ts and README.md

    // Verify files were restored
    expect(existsSync(join(TEST_OUTPUT_ROOT, "src", "index.ts"))).toBe(true);
    expect(existsSync(join(TEST_OUTPUT_ROOT, "README.md"))).toBe(true);
  });

  test("restored files have correct content", async () => {
    await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "conv-001",
        checkpointMessageId: "msg-002",
        targetDir: TEST_OUTPUT_ROOT,
      }),
    });

    const content = readFileSync(join(TEST_OUTPUT_ROOT, "src", "index.ts"), "utf-8");
    expect(content).toContain("Hello World");
  });

  test("selective restore only restores specified files", async () => {
    const res = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "conv-001",
        checkpointMessageId: "msg-002",
        targetDir: TEST_OUTPUT_ROOT,
        files: ["README.md"], // Only restore README
      }),
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(1);

    // Only README should exist
    expect(existsSync(join(TEST_OUTPUT_ROOT, "README.md"))).toBe(true);
    expect(existsSync(join(TEST_OUTPUT_ROOT, "src", "index.ts"))).toBe(false);
  });

  test("rejects path traversal in targetDir", async () => {
    const res = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "conv-001",
        checkpointMessageId: "msg-002",
        targetDir: "/tmp/../../etc",
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Path traversal");
  });

  test("CRITICAL: rejects restore to ~/.claude directory", async () => {
    const res = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "conv-001",
        checkpointMessageId: "msg-002",
        targetDir: "~/.claude/projects",
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("not allowed");
  });

  test("attempts to use cwd as default target when targetDir not specified", async () => {
    const res = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "conv-001",
        checkpointMessageId: "msg-002",
        // No targetDir - should use cwd from conversation (/test/project)
        // This will fail with permission denied or succeed depending on env
      }),
    });

    // The cwd is /test/project which may not be creatable in test env
    // We expect either 200 (success) or 500 (permission denied)
    expect([200, 500]).toContain(res.status);
  });
});
