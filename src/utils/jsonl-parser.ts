import type { Checkpoint, FileBackup } from "../types";

interface JSONLEntry {
  type?: string;
  cwd?: string;
  messageId?: string;
  gitBranch?: string;
  snapshot?: {
    messageId?: string;
    trackedFileBackups?: Record<string, FileBackup>;
    timestamp?: string;
  };
  timestamp?: string;
  [key: string]: unknown;
}

export interface ConversationMetadata {
  gitBranch?: string;
  filesModified: number;
}

/**
 * Parses JSONL content into an array of objects.
 * Skips empty lines and invalid JSON.
 */
export function parseJSONL(content: string): JSONLEntry[] {
  const lines = content.split("\n");
  const entries: JSONLEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed);
      entries.push(parsed);
    } catch {
      // Skip invalid JSON lines
    }
  }

  return entries;
}

/**
 * Extracts the CWD (current working directory) from JSONL entries.
 * Returns the first CWD found, or empty string if none.
 */
export function extractCwd(entries: JSONLEntry[]): string {
  for (const entry of entries) {
    if (entry.cwd) {
      return entry.cwd;
    }
  }
  return "";
}

/**
 * Extracts checkpoints (file-history-snapshot entries) from JSONL entries.
 */
export function extractCheckpoints(entries: JSONLEntry[]): Checkpoint[] {
  const checkpoints: Checkpoint[] = [];

  for (const entry of entries) {
    if (entry.type === "file-history-snapshot" && entry.snapshot?.trackedFileBackups) {
      const files = entry.snapshot.trackedFileBackups;
      const fileCount = Object.keys(files).length;

      checkpoints.push({
        messageId: entry.messageId || "",
        timestamp: entry.snapshot.timestamp || entry.timestamp || "",
        fileCount,
        files,
      });
    }
  }

  return checkpoints;
}

/**
 * Finds a specific checkpoint by message ID
 */
export function findCheckpointByMessageId(
  entries: JSONLEntry[],
  messageId: string
): Checkpoint | null {
  for (const entry of entries) {
    if (
      entry.type === "file-history-snapshot" &&
      entry.messageId === messageId &&
      entry.snapshot?.trackedFileBackups
    ) {
      const files = entry.snapshot.trackedFileBackups;
      return {
        messageId: entry.messageId,
        timestamp: entry.snapshot.timestamp || entry.timestamp || "",
        fileCount: Object.keys(files).length,
        files,
      };
    }
  }
  return null;
}

/**
 * Extracts conversation metadata including git branch and unique files modified.
 */
export function extractConversationMetadata(entries: JSONLEntry[]): ConversationMetadata {
  let gitBranch: string | undefined;
  const allFiles = new Set<string>();

  for (const entry of entries) {
    // Extract git branch from user messages
    if (entry.type === "user" && entry.gitBranch && !gitBranch) {
      gitBranch = entry.gitBranch;
    }

    // Collect all unique file paths from checkpoints
    if (entry.type === "file-history-snapshot" && entry.snapshot?.trackedFileBackups) {
      for (const filePath of Object.keys(entry.snapshot.trackedFileBackups)) {
        allFiles.add(filePath);
      }
    }
  }

  return {
    gitBranch,
    filesModified: allFiles.size,
  };
}
