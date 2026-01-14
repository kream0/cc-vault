import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from "bun:test";
import { mkdir, rm, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { createServer } from "../../../src/server";
import { createConfig, type AppConfig } from "../../../src/config";

describe("Import API", () => {
    let server: ReturnType<typeof createServer>;
    let config: AppConfig;
    let testDir: string;
    let importTestDir: string;
    const baseUrl = "http://localhost:3099";

    beforeAll(async () => {
        // Use a unique test directory
        testDir = join(process.cwd(), "tests", "fixtures");
        importTestDir = join(process.cwd(), "tests", "fixtures", "import-test");

        // Create import test directory
        await mkdir(importTestDir, { recursive: true });

        config = createConfig({
            claudeRoot: testDir,
            port: 3099,
        });
        server = createServer(config);
    });

    afterAll(async () => {
        server.stop();
        // Clean up import test directory
        if (existsSync(importTestDir)) {
            await rm(importTestDir, { recursive: true, force: true });
        }
    });

    describe("POST /api/import/global", () => {
        test("returns 400 for invalid data format", async () => {
            const res = await fetch(`${baseUrl}/api/import/global`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: "invalid" }),
            });
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe("Invalid import data format");
        });

        test("returns 400 for wrong export type", async () => {
            const res = await fetch(`${baseUrl}/api/import/global`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "conversation",
                        files: [],
                    },
                }),
            });
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toContain("Expected global export type");
        });

        test("successfully imports global archive", async () => {
            const res = await fetch(`${baseUrl}/api/import/global`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "global",
                        files: [
                            { path: "import-test/test-file.txt", content: "test content" },
                        ],
                    },
                    strategy: "replace",
                }),
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.filesImported).toBe(1);

            // Verify file was created
            const filePath = join(testDir, "import-test", "test-file.txt");
            expect(existsSync(filePath)).toBe(true);
            const content = await readFile(filePath, "utf-8");
            expect(content).toBe("test content");
        });

        test("merge mode skips existing files", async () => {
            // Create existing file
            const filePath = join(testDir, "import-test", "existing-file.txt");
            await writeFile(filePath, "original content", "utf-8");

            const res = await fetch(`${baseUrl}/api/import/global`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "global",
                        files: [
                            { path: "import-test/existing-file.txt", content: "new content" },
                        ],
                    },
                    strategy: "merge",
                }),
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.filesImported).toBe(0); // File was skipped

            // Verify original content preserved
            const content = await readFile(filePath, "utf-8");
            expect(content).toBe("original content");
        });
    });

    describe("POST /api/import/projects/:projectId/conversations", () => {
        test("returns 400 for invalid data format", async () => {
            const res = await fetch(`${baseUrl}/api/import/projects/test-project/conversations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: null }),
            });
            expect(res.status).toBe(400);
        });

        test("returns 400 for wrong export type", async () => {
            const res = await fetch(`${baseUrl}/api/import/projects/test-project/conversations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "global",
                        files: [],
                    },
                }),
            });
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toContain("Expected conversation export type");
        });

        test("successfully imports conversation", async () => {
            const conversationId = "imported-conv-001";
            const projectId = "import-test-project";

            const res = await fetch(`${baseUrl}/api/import/projects/${projectId}/conversations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "conversation",
                        projectId,
                        conversationId,
                        files: [
                            { path: `${conversationId}.jsonl`, content: '{"type":"summary"}\n' },
                        ],
                    },
                }),
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.filesImported).toBe(1);

            // Verify JSONL file was created in project directory
            const jsonlPath = join(config.projectsRoot, projectId, `${conversationId}.jsonl`);
            expect(existsSync(jsonlPath)).toBe(true);

            // Clean up
            await rm(join(config.projectsRoot, projectId), { recursive: true, force: true });
        });

        test("imports conversation with file history", async () => {
            const conversationId = "imported-conv-002";
            const projectId = "import-test-project-2";

            const res = await fetch(`${baseUrl}/api/import/projects/${projectId}/conversations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "conversation",
                        projectId,
                        conversationId,
                        files: [
                            { path: `${conversationId}.jsonl`, content: '{"type":"summary"}\n' },
                            { path: `file-history/${conversationId}/backup@v1`, content: "backup content" },
                        ],
                    },
                }),
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.filesImported).toBe(2);

            // Verify file history was created
            const historyPath = join(config.historyRoot, conversationId, "backup@v1");
            expect(existsSync(historyPath)).toBe(true);

            // Clean up
            await rm(join(config.projectsRoot, projectId), { recursive: true, force: true });
            await rm(join(config.historyRoot, conversationId), { recursive: true, force: true });
        });
    });

    describe("POST /api/import/checkpoint", () => {
        let checkpointTestDir: string;

        beforeEach(async () => {
            checkpointTestDir = join(process.cwd(), "tests", "fixtures", "checkpoint-restore-test");
            await mkdir(checkpointTestDir, { recursive: true });
        });

        afterEach(async () => {
            if (existsSync(checkpointTestDir)) {
                await rm(checkpointTestDir, { recursive: true, force: true });
            }
        });

        test("returns 400 for invalid data format", async () => {
            const res = await fetch(`${baseUrl}/api/import/checkpoint`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: "invalid", targetDir: checkpointTestDir }),
            });
            expect(res.status).toBe(400);
        });

        test("returns 400 for missing targetDir", async () => {
            const res = await fetch(`${baseUrl}/api/import/checkpoint`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "checkpoint",
                        files: [],
                    },
                }),
            });
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toBe("targetDir is required for checkpoint import");
        });

        test("returns 400 for wrong export type", async () => {
            const res = await fetch(`${baseUrl}/api/import/checkpoint`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "conversation",
                        files: [],
                    },
                    targetDir: checkpointTestDir,
                }),
            });
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toContain("Expected checkpoint export type");
        });

        test("successfully imports checkpoint files", async () => {
            const res = await fetch(`${baseUrl}/api/import/checkpoint`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "checkpoint",
                        files: [
                            { path: "src/index.ts", content: "export const foo = 1;" },
                            { path: "README.md", content: "# Test" },
                        ],
                    },
                    targetDir: checkpointTestDir,
                }),
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
            expect(data.filesImported).toBe(2);

            // Verify files were created
            expect(existsSync(join(checkpointTestDir, "src", "index.ts"))).toBe(true);
            expect(existsSync(join(checkpointTestDir, "README.md"))).toBe(true);

            // Verify content
            const indexContent = await readFile(join(checkpointTestDir, "src", "index.ts"), "utf-8");
            expect(indexContent).toBe("export const foo = 1;");
        });

        test("handles absolute paths in checkpoint files", async () => {
            const res = await fetch(`${baseUrl}/api/import/checkpoint`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "checkpoint",
                        files: [
                            { path: "/home/user/project/src/main.ts", content: "main content" },
                        ],
                    },
                    targetDir: checkpointTestDir,
                }),
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);

            // Verify file was created relative to targetDir
            expect(existsSync(join(checkpointTestDir, "home", "user", "project", "src", "main.ts"))).toBe(true);
        });

        test("rejects path traversal in targetDir", async () => {
            const res = await fetch(`${baseUrl}/api/import/checkpoint`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    data: {
                        exportedAt: new Date().toISOString(),
                        type: "checkpoint",
                        files: [],
                    },
                    targetDir: "/tmp/../etc/passwd",
                }),
            });
            expect(res.status).toBe(400);
            const data = await res.json();
            expect(data.error).toContain("Path traversal");
        });
    });
});
