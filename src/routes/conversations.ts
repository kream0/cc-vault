import { readdir, stat, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { AppConfig } from "../config";
import type { Conversation } from "../types";
import { parseJSONL, extractConversationMetadata } from "../utils/jsonl-parser";

export async function handleGetConversations(
  config: AppConfig,
  projectId: string
): Promise<Response> {
  const projectPath = join(config.projectsRoot, projectId);

  try {
    if (!existsSync(projectPath)) {
      return Response.json([]);
    }

    const files = await readdir(projectPath);
    const conversations: Conversation[] = [];

    for (const file of files) {
      // Skip agent conversation files (sub-agents spawned via "Task" tool)
      // These have no file-history-snapshot entries and clutter the UI
      if (file.startsWith("agent-")) continue;

      if (file.endsWith(".jsonl")) {
        const filePath = join(projectPath, file);
        const stats = await stat(filePath);

        // Read and parse JSONL to extract metadata
        let gitBranch: string | undefined;
        let filesModified: number | undefined;

        try {
          const content = await readFile(filePath, "utf-8");
          const entries = parseJSONL(content);
          const metadata = extractConversationMetadata(entries);
          gitBranch = metadata.gitBranch;
          filesModified = metadata.filesModified;
        } catch {
          // Ignore parsing errors, metadata will be undefined
        }

        conversations.push({
          id: file.replace(".jsonl", ""),
          filename: file,
          mtime: stats.mtime,
          gitBranch,
          filesModified,
        });
      }
    }

    // Sort by most recent first
    conversations.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    return Response.json(conversations);
  } catch (e) {
    return Response.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
