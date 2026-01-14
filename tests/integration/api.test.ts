import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { createServer } from "../../src/server";
import { createTestConfig, TEST_OUTPUT_ROOT, setupTestOutput, cleanupTestOutput } from "../setup";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import type { Server } from "bun";

describe("API Integration", () => {
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

  test("complete browse and restore flow", async () => {
    // Step 1: Get projects
    const projectsRes = await fetch(`${baseUrl}/api/projects`);
    expect(projectsRes.status).toBe(200);

    const projects = await projectsRes.json();
    expect(projects.length).toBeGreaterThan(0);

    const projectId = projects[0].id;

    // Step 2: Get conversations for project
    const convsRes = await fetch(`${baseUrl}/api/projects/${projectId}/conversations`);
    expect(convsRes.status).toBe(200);

    const conversations = await convsRes.json();
    expect(conversations.length).toBeGreaterThan(0);

    const convId = conversations.find((c: { id: string }) => c.id === "conv-001")?.id || conversations[0].id;

    // Step 3: Get checkpoints for conversation
    const checkpointsRes = await fetch(
      `${baseUrl}/api/conversations/${convId}/checkpoints?projectId=${projectId}`
    );
    expect(checkpointsRes.status).toBe(200);

    const checkpointsData = await checkpointsRes.json();
    expect(checkpointsData.checkpoints.length).toBeGreaterThan(0);

    // Find a checkpoint with files
    const checkpointWithFiles = checkpointsData.checkpoints.find(
      (c: { fileCount: number }) => c.fileCount > 0
    );

    if (!checkpointWithFiles) {
      // Skip restore if no checkpoints with files
      return;
    }

    // Step 4: Preview a file before restoring
    const filePath = Object.keys(checkpointWithFiles.files)[0];
    const previewParams = new URLSearchParams({
      projectId,
      conversationId: convId,
      checkpointMessageId: checkpointWithFiles.messageId,
      filePath,
    });

    const previewRes = await fetch(`${baseUrl}/api/blob?${previewParams}`);
    expect(previewRes.status).toBe(200);

    const fileContent = await previewRes.text();
    expect(fileContent.length).toBeGreaterThan(0);

    // Step 5: Restore checkpoint
    const restoreRes = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        conversationId: convId,
        checkpointMessageId: checkpointWithFiles.messageId,
        targetDir: TEST_OUTPUT_ROOT,
      }),
    });

    expect(restoreRes.status).toBe(200);

    const restoreData = await restoreRes.json();
    expect(restoreData.success).toBe(true);
    expect(restoreData.count).toBeGreaterThan(0);
  });

  test("selective restore flow", async () => {
    // Get checkpoints
    const checkpointsRes = await fetch(
      `${baseUrl}/api/conversations/conv-001/checkpoints?projectId=test-project`
    );
    const checkpointsData = await checkpointsRes.json();

    const checkpointWithMultipleFiles = checkpointsData.checkpoints.find(
      (c: { fileCount: number }) => c.fileCount >= 2
    );

    if (!checkpointWithMultipleFiles) {
      return;
    }

    const files = Object.keys(checkpointWithMultipleFiles.files);
    const selectedFile = files[0];

    // Restore only one file
    const restoreRes = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "conv-001",
        checkpointMessageId: checkpointWithMultipleFiles.messageId,
        targetDir: TEST_OUTPUT_ROOT,
        files: [selectedFile],
      }),
    });

    expect(restoreRes.status).toBe(200);

    const restoreData = await restoreRes.json();
    expect(restoreData.success).toBe(true);
    expect(restoreData.count).toBe(1);

    // Verify only selected file was restored
    expect(restoreData.files.length).toBe(1);
  });

  test("error handling for invalid requests", async () => {
    // Invalid project
    const invalidProjectRes = await fetch(`${baseUrl}/api/projects/invalid/conversations`);
    expect(invalidProjectRes.status).toBe(200); // Returns empty array
    const emptyConvs = await invalidProjectRes.json();
    expect(emptyConvs).toEqual([]);

    // Invalid conversation
    const invalidConvRes = await fetch(
      `${baseUrl}/api/conversations/invalid/checkpoints?projectId=test-project`
    );
    expect(invalidConvRes.status).toBe(404);

    // Invalid restore target
    const invalidRestoreRes = await fetch(`${baseUrl}/api/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: "test-project",
        conversationId: "conv-001",
        checkpointMessageId: "msg-002",
        targetDir: "~/.claude/dangerous",
      }),
    });
    expect(invalidRestoreRes.status).toBe(400);
  });

  test("static file serving", async () => {
    const indexRes = await fetch(`${baseUrl}/`);
    expect(indexRes.status).toBe(200);

    const html = await indexRes.text();
    expect(html).toContain("Claude Restore");
    expect(html).toContain("alpinejs");
  });

  test("404 for unknown routes", async () => {
    const unknownRes = await fetch(`${baseUrl}/api/unknown`);
    expect(unknownRes.status).toBe(404);
  });
});

describe("Config Integration", () => {
  test("server uses custom config", async () => {
    const customConfig = {
      ...createTestConfig(),
      port: 0,
    };

    const customServer = createServer(customConfig);

    try {
      const res = await fetch(`http://localhost:${customServer.port}/api/projects`);
      expect(res.status).toBe(200);
    } finally {
      customServer.stop();
    }
  });
});
