import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import type { AppConfig } from "../config";
import { validateTargetDir, expandPath, isClaudePath } from "../utils/paths";

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

interface ImportResult {
    success: boolean;
    filesImported: number;
    errors?: string[];
    message?: string;
}

/**
 * Validate that the import data has the expected structure
 */
function validateExportData(data: unknown): data is ExportData {
    if (!data || typeof data !== "object") return false;
    const d = data as Record<string, unknown>;
    if (typeof d.exportedAt !== "string") return false;
    if (!["global", "project", "conversation", "checkpoint"].includes(d.type as string)) return false;
    if (!Array.isArray(d.files)) return false;
    return d.files.every(
        (f: unknown) =>
            typeof f === "object" &&
            f !== null &&
            typeof (f as ExportFile).path === "string" &&
            typeof (f as ExportFile).content === "string"
    );
}

/**
 * Import a global archive back to ~/.claude
 * POST /api/import/global
 */
export async function handleImportGlobal(
    config: AppConfig,
    req: Request
): Promise<Response> {
    try {
        const body = await req.json();
        const { data, strategy = "merge" } = body as { data: unknown; strategy?: "merge" | "replace" };

        if (!validateExportData(data)) {
            return Response.json(
                { error: "Invalid import data format" },
                { status: 400 }
            );
        }

        if (data.type !== "global") {
            return Response.json(
                { error: `Expected global export type, got: ${data.type}` },
                { status: 400 }
            );
        }

        const errors: string[] = [];
        let filesImported = 0;

        for (const file of data.files) {
            try {
                const targetPath = join(config.claudeRoot, file.path);
                const targetDir = dirname(targetPath);

                // Create directory if it doesn't exist
                if (!existsSync(targetDir)) {
                    await mkdir(targetDir, { recursive: true });
                }

                // Check if file exists and strategy is merge
                if (strategy === "merge" && existsSync(targetPath)) {
                    // Skip existing files in merge mode
                    continue;
                }

                await writeFile(targetPath, file.content, "utf-8");
                filesImported++;
            } catch (e) {
                errors.push(`Failed to write ${file.path}: ${(e as Error).message}`);
            }
        }

        const result: ImportResult = {
            success: errors.length === 0,
            filesImported,
            message: `Imported ${filesImported} files${strategy === "merge" ? " (merge mode)" : " (replace mode)"}`
        };

        if (errors.length > 0) {
            result.errors = errors;
        }

        return Response.json(result);
    } catch (e) {
        console.error("Import error:", e);
        return Response.json(
            { error: `Import failed: ${(e as Error).message}` },
            { status: 500 }
        );
    }
}

/**
 * Import a conversation into a project
 * POST /api/import/projects/:projectId/conversations
 */
export async function handleImportConversation(
    config: AppConfig,
    projectId: string,
    req: Request
): Promise<Response> {
    try {
        const body = await req.json();
        const { data } = body as { data: unknown };

        if (!validateExportData(data)) {
            return Response.json(
                { error: "Invalid import data format" },
                { status: 400 }
            );
        }

        if (data.type !== "conversation") {
            return Response.json(
                { error: `Expected conversation export type, got: ${data.type}` },
                { status: 400 }
            );
        }

        // Ensure project directory exists
        const projectDir = join(config.projectsRoot, projectId);
        if (!existsSync(projectDir)) {
            await mkdir(projectDir, { recursive: true });
        }

        const errors: string[] = [];
        let filesImported = 0;

        for (const file of data.files) {
            try {
                let targetPath: string;

                if (file.path.startsWith("file-history/")) {
                    // File history goes to ~/.claude/file-history/
                    const historyRelPath = file.path.replace("file-history/", "");
                    targetPath = join(config.historyRoot, historyRelPath);
                } else {
                    // Conversation JSONL goes to the project directory
                    targetPath = join(projectDir, file.path);
                }

                const targetDir = dirname(targetPath);

                // Create directory if it doesn't exist
                if (!existsSync(targetDir)) {
                    await mkdir(targetDir, { recursive: true });
                }

                await writeFile(targetPath, file.content, "utf-8");
                filesImported++;
            } catch (e) {
                errors.push(`Failed to write ${file.path}: ${(e as Error).message}`);
            }
        }

        const result: ImportResult = {
            success: errors.length === 0,
            filesImported,
            message: `Imported conversation with ${filesImported} files`
        };

        if (errors.length > 0) {
            result.errors = errors;
        }

        return Response.json(result);
    } catch (e) {
        console.error("Import error:", e);
        return Response.json(
            { error: `Import failed: ${(e as Error).message}` },
            { status: 500 }
        );
    }
}

/**
 * Import/restore files from an exported checkpoint
 * POST /api/import/checkpoint
 */
export async function handleImportCheckpoint(
    config: AppConfig,
    req: Request
): Promise<Response> {
    try {
        const body = await req.json();
        const { data, targetDir } = body as { data: unknown; targetDir?: string };

        if (!validateExportData(data)) {
            return Response.json(
                { error: "Invalid import data format" },
                { status: 400 }
            );
        }

        if (data.type !== "checkpoint") {
            return Response.json(
                { error: `Expected checkpoint export type, got: ${data.type}` },
                { status: 400 }
            );
        }

        // Validate target directory if provided
        if (targetDir) {
            try {
                validateTargetDir(targetDir);
            } catch (e) {
                return Response.json(
                    { error: (e as Error).message },
                    { status: 400 }
                );
            }
        }

        // If no target directory specified, we need one
        if (!targetDir) {
            return Response.json(
                { error: "targetDir is required for checkpoint import" },
                { status: 400 }
            );
        }

        const expandedTargetDir = expandPath(targetDir);

        const errors: string[] = [];
        let filesImported = 0;

        for (const file of data.files) {
            try {
                // Checkpoint files have the original path as the key
                // We need to restore them relative to targetDir
                let targetPath: string;

                if (file.path.startsWith("/")) {
                    // Absolute path - make it relative to targetDir
                    targetPath = join(expandedTargetDir, file.path.replace(/^\/+/, ""));
                } else {
                    targetPath = join(expandedTargetDir, file.path);
                }

                // Safety check - don't write to ~/.claude
                if (isClaudePath(targetPath)) {
                    errors.push(`Skipped ${file.path}: Cannot write to ~/.claude directory`);
                    continue;
                }

                const fileDir = dirname(targetPath);

                // Create directory if it doesn't exist
                if (!existsSync(fileDir)) {
                    await mkdir(fileDir, { recursive: true });
                }

                await writeFile(targetPath, file.content, "utf-8");
                filesImported++;
            } catch (e) {
                errors.push(`Failed to write ${file.path}: ${(e as Error).message}`);
            }
        }

        const result: ImportResult = {
            success: errors.length === 0,
            filesImported,
            message: `Restored ${filesImported} files to ${expandedTargetDir}`
        };

        if (errors.length > 0) {
            result.errors = errors;
        }

        return Response.json(result);
    } catch (e) {
        console.error("Import error:", e);
        return Response.json(
            { error: `Import failed: ${(e as Error).message}` },
            { status: 500 }
        );
    }
}
