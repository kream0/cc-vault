import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createServer } from "../../../src/server";
import { createTestConfig } from "../../setup";
import type { Server } from "bun";

describe("GET /api/conversations/:id/checkpoints", () => {
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

  test("returns 400 without projectId", async () => {
    const res = await fetch(`${baseUrl}/api/conversations/conv-001/checkpoints`);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain("projectId");
  });

  test("returns 404 for non-existent conversation", async () => {
    const res = await fetch(
      `${baseUrl}/api/conversations/nonexistent/checkpoints?projectId=test-project`
    );
    expect(res.status).toBe(404);
  });

  test("returns checkpoints for valid conversation", async () => {
    const res = await fetch(
      `${baseUrl}/api/conversations/conv-001/checkpoints?projectId=test-project`
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty("cwd");
    expect(data).toHaveProperty("checkpoints");
    expect(Array.isArray(data.checkpoints)).toBe(true);
  });

  test("extracts cwd from conversation", async () => {
    const res = await fetch(
      `${baseUrl}/api/conversations/conv-001/checkpoints?projectId=test-project`
    );
    const data = await res.json();

    expect(data.cwd).toBe("/test/project");
  });

  test("returns checkpoints with files", async () => {
    const res = await fetch(
      `${baseUrl}/api/conversations/conv-001/checkpoints?projectId=test-project`
    );
    const data = await res.json();

    // conv-001 has 2 checkpoints with files (msg-002 and msg-004)
    const checkpointsWithFiles = data.checkpoints.filter(
      (c: { fileCount: number }) => c.fileCount > 0
    );
    expect(checkpointsWithFiles.length).toBe(2);
  });

  test("each checkpoint has required properties", async () => {
    const res = await fetch(
      `${baseUrl}/api/conversations/conv-001/checkpoints?projectId=test-project`
    );
    const data = await res.json();

    for (const ckpt of data.checkpoints) {
      expect(ckpt).toHaveProperty("messageId");
      expect(ckpt).toHaveProperty("timestamp");
      expect(ckpt).toHaveProperty("fileCount");
      expect(ckpt).toHaveProperty("files");
    }
  });

  test("returns empty checkpoints for conversation with no file history", async () => {
    const res = await fetch(
      `${baseUrl}/api/conversations/conv-002/checkpoints?projectId=test-project`
    );
    const data = await res.json();

    // conv-002 only has empty checkpoints
    const checkpointsWithFiles = data.checkpoints.filter(
      (c: { fileCount: number }) => c.fileCount > 0
    );
    expect(checkpointsWithFiles.length).toBe(0);
  });
});
