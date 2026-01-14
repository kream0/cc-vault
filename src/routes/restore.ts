import { readFile } from "fs/promises";
import { existsSync, mkdirSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import type { AppConfig } from "../config";
import type { RestoreRequest, RestoreResponse } from "../types";
import { expandPath, validateTargetDir, resolveRestorePath } from "../utils/paths";
import { parseJSONL, extractCwd, findCheckpointByMessageId } from "../utils/jsonl-parser";

export async function handleRestore(
  config: AppConfig,
  req: Request
): Promise<Response> {
  try {
    const body: RestoreRequest = await req.json();
    const { conversationId, projectId, checkpointMessageId, targetDir, files } = body;

    // Validate required fields
    if (!conversationId || !projectId || !checkpointMessageId) {
      return Response.json(
        { error: "Missing required fields: conversationId, projectId, checkpointMessageId" },
        { status: 400 }
      );
    }

    const jsonlPath = join(config.projectsRoot, projectId, `${conversationId}.jsonl`);
    const historyDir = join(config.historyRoot, conversationId);

    if (!existsSync(jsonlPath)) {
      return Response.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!existsSync(historyDir)) {
      return Response.json(
        { error: "History not found for this conversation" },
        { status: 404 }
      );
    }

    // Parse conversation to find the checkpoint
    const content = await readFile(jsonlPath, "utf-8");
    const entries = parseJSONL(content);
    const projectCwd = extractCwd(entries);
    const checkpoint = findCheckpointByMessageId(entries, checkpointMessageId);

    if (!checkpoint) {
      return Response.json(
        { error: "Checkpoint not found" },
        { status: 404 }
      );
    }

    // Determine and validate target directory
    const finalTargetDir = targetDir ? expandPath(targetDir) : projectCwd;

    if (!finalTargetDir) {
      return Response.json(
        { error: "No target directory specified and no CWD found in conversation" },
        { status: 400 }
      );
    }

    // CRITICAL: Validate the target directory is safe
    try {
      validateTargetDir(finalTargetDir);
    } catch (e) {
      return Response.json(
        { error: (e as Error).message },
        { status: 400 }
      );
    }

    // Create target directory if it doesn't exist
    if (!existsSync(finalTargetDir)) {
      mkdirSync(finalTargetDir, { recursive: true });
    }

    // Determine which files to restore
    const filesToRestore = files && files.length > 0
      ? Object.entries(checkpoint.files).filter(([path]) => files.includes(path))
      : Object.entries(checkpoint.files);

    let restoredCount = 0;
    const restoredFiles: string[] = [];

    for (const [filePath, fileInfo] of filesToRestore) {
      // Skip files without backup (backupFileName is null)
      if (!fileInfo.backupFileName) {
        continue;
      }

      const backupFile = join(historyDir, fileInfo.backupFileName);

      if (!existsSync(backupFile)) {
        continue;
      }

      const destPath = resolveRestorePath(filePath, finalTargetDir, projectCwd);
      const destDir = dirname(destPath);

      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      copyFileSync(backupFile, destPath);
      restoredCount++;
      restoredFiles.push(destPath);
    }

    const response: RestoreResponse = {
      success: true,
      count: restoredCount,
      files: restoredFiles,
    };

    return Response.json(response);
  } catch (e) {
    console.error("Restore error:", e);
    return Response.json(
      { error: String(e), success: false, count: 0, files: [] },
      { status: 500 }
    );
  }
}
