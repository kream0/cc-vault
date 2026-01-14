import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { AppConfig } from "../config";
import { parseJSONL, findCheckpointByMessageId } from "../utils/jsonl-parser";

export async function handleGetBlob(
  config: AppConfig,
  url: URL
): Promise<Response> {
  const projectId = url.searchParams.get("projectId");
  const conversationId = url.searchParams.get("conversationId");
  const checkpointMessageId = url.searchParams.get("checkpointMessageId");
  const filePath = url.searchParams.get("filePath");

  if (!projectId || !conversationId || !checkpointMessageId || !filePath) {
    return Response.json(
      { error: "Missing required query parameters: projectId, conversationId, checkpointMessageId, filePath" },
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

  try {
    // Parse conversation to find the checkpoint
    const content = await readFile(jsonlPath, "utf-8");
    const entries = parseJSONL(content);
    const checkpoint = findCheckpointByMessageId(entries, checkpointMessageId);

    if (!checkpoint) {
      return Response.json(
        { error: "Checkpoint not found" },
        { status: 404 }
      );
    }

    const fileInfo = checkpoint.files[filePath];
    if (!fileInfo) {
      return Response.json(
        { error: "File not found in checkpoint" },
        { status: 404 }
      );
    }

    // Handle case where backupFileName is null (file was tracked but no backup exists)
    if (!fileInfo.backupFileName) {
      return Response.json(
        { error: "No backup file available for this file (file was tracked but not yet backed up)" },
        { status: 404 }
      );
    }

    const backupFilePath = join(historyDir, fileInfo.backupFileName);
    if (!existsSync(backupFilePath)) {
      return Response.json(
        { error: "Backup file not found on disk" },
        { status: 404 }
      );
    }

    // Read the file content
    const fileContent = await readFile(backupFilePath, "utf-8");

    // Determine content type based on file extension
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      ts: "text/typescript",
      tsx: "text/typescript",
      js: "text/javascript",
      jsx: "text/javascript",
      json: "application/json",
      md: "text/markdown",
      html: "text/html",
      css: "text/css",
      py: "text/x-python",
      rs: "text/x-rust",
      go: "text/x-go",
      java: "text/x-java",
      c: "text/x-c",
      cpp: "text/x-c++",
      h: "text/x-c",
      hpp: "text/x-c++",
      sh: "text/x-shellscript",
      yml: "text/yaml",
      yaml: "text/yaml",
      toml: "text/toml",
      xml: "text/xml",
      sql: "text/x-sql",
    };

    const contentType = contentTypes[ext] || "text/plain";

    return new Response(fileContent, {
      headers: {
        "Content-Type": `${contentType}; charset=utf-8`,
        "X-File-Path": filePath,
        "X-Backup-Version": String(fileInfo.version),
      },
    });
  } catch (e) {
    // If it's a binary file or encoding issue, return as binary
    if ((e as Error).message?.includes("encoding")) {
      const backupFilePath = join(historyDir, checkpointMessageId);
      const binaryContent = await Bun.file(backupFilePath).arrayBuffer();
      return new Response(binaryContent, {
        headers: {
          "Content-Type": "application/octet-stream",
        },
      });
    }

    return Response.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
