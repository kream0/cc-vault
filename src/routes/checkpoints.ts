import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { AppConfig } from "../config";
import type { CheckpointResponse } from "../types";
import { parseJSONL, extractCwd, extractCheckpoints } from "../utils/jsonl-parser";

export async function handleGetCheckpoints(
  config: AppConfig,
  conversationId: string,
  projectId: string | null
): Promise<Response> {
  if (!projectId) {
    return Response.json(
      { error: "Missing projectId query parameter" },
      { status: 400 }
    );
  }

  const jsonlPath = join(config.projectsRoot, projectId, `${conversationId}.jsonl`);

  if (!existsSync(jsonlPath)) {
    return Response.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  try {
    const content = await readFile(jsonlPath, "utf-8");
    const entries = parseJSONL(content);
    const cwd = extractCwd(entries);
    const checkpoints = extractCheckpoints(entries);

    const response: CheckpointResponse = {
      cwd,
      checkpoints,
    };

    return Response.json(response);
  } catch (e) {
    return Response.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
