import { readFile, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, basename } from "path";
import type { AppConfig } from "../config";

interface ExportFile {
    path: string;
    content: string;
}

interface ExportData {
    exportedAt: string;
    type: "global" | "project" | "conversation" | "checkpoint";
    claudeRoot?: string;
    projectId?: string;
    conversationId?: string;
    checkpointMessageId?: string;
    files: ExportFile[];
}

/**
 * Recursively collects all files in a directory
 */
async function collectFiles(
    dir: string,
    basePath: string = ""
): Promise<ExportFile[]> {
    const files: ExportFile[] = [];

    if (!existsSync(dir)) {
        return files;
    }

    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
            const subFiles = await collectFiles(fullPath, relativePath);
            files.push(...subFiles);
        } else if (entry.isFile()) {
            try {
                const content = await readFile(fullPath, "utf-8");
                files.push({ path: relativePath, content });
            } catch {
                // Skip binary files or files that can't be read as UTF-8
            }
        }
    }

    return files;
}

/**
 * Export the entire .claude folder
 */
export async function handleExportGlobal(
    config: AppConfig
): Promise<Response> {
    try {
        const files = await collectFiles(config.claudeRoot);

        const exportData: ExportData = {
            exportedAt: new Date().toISOString(),
            type: "global",
            claudeRoot: config.claudeRoot,
            files
        };

        return new Response(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="claude-backup-${Date.now()}.json"`
            }
        });
    } catch (e) {
        console.error("Export error:", e);
        return Response.json(
            { error: `Export failed: ${(e as Error).message}` },
            { status: 500 }
        );
    }
}

/**
 * Export a specific project's conversations
 */
export async function handleExportProject(
    config: AppConfig,
    projectId: string
): Promise<Response> {
    try {
        const projectDir = join(config.projectsRoot, projectId);

        if (!existsSync(projectDir)) {
            return Response.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        const files = await collectFiles(projectDir);

        // Also collect file-history for all conversations in this project
        const historyFiles: ExportFile[] = [];
        const projectFiles = await readdir(projectDir);

        for (const file of projectFiles) {
            if (file.endsWith(".jsonl")) {
                const convId = file.replace(".jsonl", "");
                const historyDir = join(config.historyRoot, convId);
                if (existsSync(historyDir)) {
                    const convHistoryFiles = await collectFiles(historyDir, `file-history/${convId}`);
                    historyFiles.push(...convHistoryFiles);
                }
            }
        }

        const exportData: ExportData = {
            exportedAt: new Date().toISOString(),
            type: "project",
            projectId,
            files: [...files, ...historyFiles]
        };

        return new Response(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="claude-project-${projectId.slice(0, 20)}-${Date.now()}.json"`
            }
        });
    } catch (e) {
        console.error("Export error:", e);
        return Response.json(
            { error: `Export failed: ${(e as Error).message}` },
            { status: 500 }
        );
    }
}

/**
 * Export a specific conversation with its file history
 */
export async function handleExportConversation(
    config: AppConfig,
    projectId: string,
    conversationId: string
): Promise<Response> {
    try {
        const jsonlPath = join(config.projectsRoot, projectId, `${conversationId}.jsonl`);
        const historyDir = join(config.historyRoot, conversationId);

        if (!existsSync(jsonlPath)) {
            return Response.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        const files: ExportFile[] = [];

        // Add the conversation JSONL
        const jsonlContent = await readFile(jsonlPath, "utf-8");
        files.push({ path: `${conversationId}.jsonl`, content: jsonlContent });

        // Add file history
        if (existsSync(historyDir)) {
            const historyFiles = await collectFiles(historyDir, `file-history/${conversationId}`);
            files.push(...historyFiles);
        }

        const exportData: ExportData = {
            exportedAt: new Date().toISOString(),
            type: "conversation",
            projectId,
            conversationId,
            files
        };

        return new Response(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="claude-conversation-${conversationId.slice(0, 8)}-${Date.now()}.json"`
            }
        });
    } catch (e) {
        console.error("Export error:", e);
        return Response.json(
            { error: `Export failed: ${(e as Error).message}` },
            { status: 500 }
        );
    }
}

/**
 * Export a specific checkpoint's files
 */
export async function handleExportCheckpoint(
    config: AppConfig,
    url: URL
): Promise<Response> {
    const projectId = url.searchParams.get("projectId");
    const conversationId = url.searchParams.get("conversationId");
    const checkpointMessageId = url.searchParams.get("checkpointMessageId");

    if (!projectId || !conversationId || !checkpointMessageId) {
        return Response.json(
            { error: "Missing required parameters: projectId, conversationId, checkpointMessageId" },
            { status: 400 }
        );
    }

    try {
        const jsonlPath = join(config.projectsRoot, projectId, `${conversationId}.jsonl`);
        const historyDir = join(config.historyRoot, conversationId);

        if (!existsSync(jsonlPath)) {
            return Response.json(
                { error: "Conversation not found" },
                { status: 404 }
            );
        }

        // Parse JSONL to find the checkpoint
        const content = await readFile(jsonlPath, "utf-8");
        const lines = content.split("\n").filter(line => line.trim());

        let checkpoint: any = null;
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                if (
                    entry.type === "file-history-snapshot" &&
                    entry.messageId === checkpointMessageId &&
                    entry.snapshot?.trackedFileBackups
                ) {
                    checkpoint = entry;
                    break;
                }
            } catch {
                // Skip invalid JSON lines
            }
        }

        if (!checkpoint) {
            return Response.json(
                { error: "Checkpoint not found" },
                { status: 404 }
            );
        }

        const files: ExportFile[] = [];
        const trackedFiles = checkpoint.snapshot.trackedFileBackups;

        // Collect each file's backup content
        for (const [filePath, fileInfo] of Object.entries(trackedFiles) as [string, any][]) {
            if (!fileInfo.backupFileName) continue;

            const backupPath = join(historyDir, fileInfo.backupFileName);
            if (existsSync(backupPath)) {
                try {
                    const fileContent = await readFile(backupPath, "utf-8");
                    files.push({
                        path: filePath,
                        content: fileContent
                    });
                } catch {
                    // Skip binary files
                }
            }
        }

        const exportData: ExportData = {
            exportedAt: new Date().toISOString(),
            type: "checkpoint",
            projectId,
            conversationId,
            checkpointMessageId,
            files
        };

        return new Response(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="claude-checkpoint-${checkpointMessageId.slice(0, 8)}-${Date.now()}.json"`
            }
        });
    } catch (e) {
        console.error("Export error:", e);
        return Response.json(
            { error: `Export failed: ${(e as Error).message}` },
            { status: 500 }
        );
    }
}
