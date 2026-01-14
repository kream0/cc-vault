import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createServer } from "../../../src/server";
import { createTestConfig, TEST_FIXTURES_ROOT } from "../../setup";
import { join } from "path";
import type { Server } from "bun";

describe("GET /api/projects", () => {
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

  test("returns list of projects", async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test("each project has id, name, and path", async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    const data = await res.json();

    for (const project of data) {
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("path");
    }
  });

  test("project name is decoded from id", async () => {
    const res = await fetch(`${baseUrl}/api/projects`);
    const data = await res.json();

    // Our fixture has "test-project" which doesn't start with dash
    const testProject = data.find((p: { id: string }) => p.id === "test-project");
    expect(testProject).toBeDefined();
    expect(testProject.name).toBe("test-project");
  });

  test("returns empty array for non-existent projects dir", async () => {
    const emptyConfig = {
      ...createTestConfig(),
      projectsRoot: join(TEST_FIXTURES_ROOT, "nonexistent"),
    };
    const emptyServer = createServer(emptyConfig);

    try {
      const res = await fetch(`http://localhost:${emptyServer.port}/api/projects`);
      const data = await res.json();
      expect(data).toEqual([]);
    } finally {
      emptyServer.stop();
    }
  });
});
