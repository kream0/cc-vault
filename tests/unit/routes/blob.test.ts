import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createServer } from "../../../src/server";
import { createTestConfig } from "../../setup";
import type { Server } from "bun";

describe("GET /api/blob", () => {
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

  test("returns 400 for missing parameters", async () => {
    const res = await fetch(`${baseUrl}/api/blob`);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("Missing required");
  });

  test("returns 400 for partial parameters", async () => {
    const res = await fetch(`${baseUrl}/api/blob?projectId=test-project`);
    expect(res.status).toBe(400);
  });

  test("returns 404 for non-existent conversation", async () => {
    const params = new URLSearchParams({
      projectId: "test-project",
      conversationId: "nonexistent",
      checkpointMessageId: "msg-002",
      filePath: "src/index.ts",
    });
    const res = await fetch(`${baseUrl}/api/blob?${params}`);
    expect(res.status).toBe(404);
  });

  test("returns 404 for non-existent checkpoint", async () => {
    const params = new URLSearchParams({
      projectId: "test-project",
      conversationId: "conv-001",
      checkpointMessageId: "nonexistent",
      filePath: "src/index.ts",
    });
    const res = await fetch(`${baseUrl}/api/blob?${params}`);
    expect(res.status).toBe(404);
  });

  test("returns 404 for non-existent file in checkpoint", async () => {
    const params = new URLSearchParams({
      projectId: "test-project",
      conversationId: "conv-001",
      checkpointMessageId: "msg-002",
      filePath: "nonexistent.ts",
    });
    const res = await fetch(`${baseUrl}/api/blob?${params}`);
    expect(res.status).toBe(404);
  });

  test("returns file content for valid request", async () => {
    const params = new URLSearchParams({
      projectId: "test-project",
      conversationId: "conv-001",
      checkpointMessageId: "msg-002",
      filePath: "src/index.ts",
    });
    const res = await fetch(`${baseUrl}/api/blob?${params}`);
    expect(res.status).toBe(200);

    const content = await res.text();
    expect(content).toContain("Hello World");
  });

  test("sets appropriate content type for TypeScript files", async () => {
    const params = new URLSearchParams({
      projectId: "test-project",
      conversationId: "conv-001",
      checkpointMessageId: "msg-002",
      filePath: "src/index.ts",
    });
    const res = await fetch(`${baseUrl}/api/blob?${params}`);

    const contentType = res.headers.get("Content-Type");
    expect(contentType).toContain("text/typescript");
  });

  test("sets appropriate content type for Markdown files", async () => {
    const params = new URLSearchParams({
      projectId: "test-project",
      conversationId: "conv-001",
      checkpointMessageId: "msg-002",
      filePath: "README.md",
    });
    const res = await fetch(`${baseUrl}/api/blob?${params}`);

    const contentType = res.headers.get("Content-Type");
    expect(contentType).toContain("text/markdown");
  });

  test("includes file path in response headers", async () => {
    const params = new URLSearchParams({
      projectId: "test-project",
      conversationId: "conv-001",
      checkpointMessageId: "msg-002",
      filePath: "src/index.ts",
    });
    const res = await fetch(`${baseUrl}/api/blob?${params}`);

    expect(res.headers.get("X-File-Path")).toBe("src/index.ts");
  });

  test("includes backup version in response headers", async () => {
    const params = new URLSearchParams({
      projectId: "test-project",
      conversationId: "conv-001",
      checkpointMessageId: "msg-002",
      filePath: "src/index.ts",
    });
    const res = await fetch(`${baseUrl}/api/blob?${params}`);

    expect(res.headers.get("X-Backup-Version")).toBe("1");
  });
});
