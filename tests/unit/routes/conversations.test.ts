import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createServer } from "../../../src/server";
import { createTestConfig } from "../../setup";
import type { Server } from "bun";

describe("GET /api/projects/:id/conversations", () => {
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

  test("returns list of conversations for valid project", async () => {
    const res = await fetch(`${baseUrl}/api/projects/test-project/conversations`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2); // conv-001 and conv-002 (agent-abc12345 is filtered)
  });

  test("filters out agent conversations (agent-*.jsonl)", async () => {
    const res = await fetch(`${baseUrl}/api/projects/test-project/conversations`);
    const data = await res.json();

    // Should not include agent-abc12345
    const agentConv = data.find((c: { id: string }) => c.id.startsWith("agent-"));
    expect(agentConv).toBeUndefined();

    // Should only have regular conversations
    const ids = data.map((c: { id: string }) => c.id);
    expect(ids).toContain("conv-001");
    expect(ids).toContain("conv-002");
    expect(ids).not.toContain("agent-abc12345");
  });

  test("each conversation has id, filename, and mtime", async () => {
    const res = await fetch(`${baseUrl}/api/projects/test-project/conversations`);
    const data = await res.json();

    for (const conv of data) {
      expect(conv).toHaveProperty("id");
      expect(conv).toHaveProperty("filename");
      expect(conv).toHaveProperty("mtime");
    }
  });

  test("conversation id is filename without extension", async () => {
    const res = await fetch(`${baseUrl}/api/projects/test-project/conversations`);
    const data = await res.json();

    const conv = data.find((c: { id: string }) => c.id === "conv-001");
    expect(conv).toBeDefined();
    expect(conv.filename).toBe("conv-001.jsonl");
  });

  test("returns empty array for non-existent project", async () => {
    const res = await fetch(`${baseUrl}/api/projects/nonexistent/conversations`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual([]);
  });

  test("conversations are sorted by mtime descending", async () => {
    const res = await fetch(`${baseUrl}/api/projects/test-project/conversations`);
    const data = await res.json();

    if (data.length >= 2) {
      const times = data.map((c: { mtime: string }) => new Date(c.mtime).getTime());
      for (let i = 1; i < times.length; i++) {
        expect(times[i - 1]).toBeGreaterThanOrEqual(times[i]);
      }
    }
  });

  test("conversation includes gitBranch when present in JSONL", async () => {
    const res = await fetch(`${baseUrl}/api/projects/test-project/conversations`);
    const data = await res.json();

    const conv001 = data.find((c: { id: string }) => c.id === "conv-001");
    expect(conv001).toBeDefined();
    expect(conv001.gitBranch).toBe("main");

    const conv002 = data.find((c: { id: string }) => c.id === "conv-002");
    expect(conv002).toBeDefined();
    expect(conv002.gitBranch).toBe("feature/new-feature");
  });

  test("conversation includes filesModified count", async () => {
    const res = await fetch(`${baseUrl}/api/projects/test-project/conversations`);
    const data = await res.json();

    const conv001 = data.find((c: { id: string }) => c.id === "conv-001");
    expect(conv001).toBeDefined();
    // conv-001 has 3 unique files: src/index.ts, README.md, src/utils.ts
    expect(conv001.filesModified).toBe(3);

    const conv002 = data.find((c: { id: string }) => c.id === "conv-002");
    expect(conv002).toBeDefined();
    // conv-002 has empty trackedFileBackups
    expect(conv002.filesModified).toBe(0);
  });
});
