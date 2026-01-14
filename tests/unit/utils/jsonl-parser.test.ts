import { describe, test, expect } from "bun:test";
import {
  parseJSONL,
  extractCwd,
  extractCheckpoints,
  findCheckpointByMessageId,
  extractConversationMetadata,
} from "../../../src/utils/jsonl-parser";

describe("parseJSONL", () => {
  test("parses multiple lines", () => {
    const input = '{"a":1}\n{"b":2}\n';
    const result = parseJSONL(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ a: 1 });
    expect(result[1]).toEqual({ b: 2 });
  });

  test("skips empty lines", () => {
    const input = '{"a":1}\n\n\n{"b":2}';
    const result = parseJSONL(input);
    expect(result).toHaveLength(2);
  });

  test("skips whitespace-only lines", () => {
    const input = '{"a":1}\n   \n\t\n{"b":2}';
    const result = parseJSONL(input);
    expect(result).toHaveLength(2);
  });

  test("skips malformed JSON lines", () => {
    const input = '{"valid":true}\ninvalid json\n{"also":"valid"}';
    const result = parseJSONL(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ valid: true });
    expect(result[1]).toEqual({ also: "valid" });
  });

  test("handles empty input", () => {
    expect(parseJSONL("")).toEqual([]);
  });

  test("handles single line", () => {
    const result = parseJSONL('{"single":true}');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ single: true });
  });
});

describe("extractCwd", () => {
  test("finds cwd from first entry with cwd", () => {
    const entries = [
      { type: "file-history-snapshot" },
      { cwd: "/project/path", type: "user" },
      { cwd: "/other/path", type: "user" },
    ];
    expect(extractCwd(entries)).toBe("/project/path");
  });

  test("returns empty string if no cwd found", () => {
    const entries = [
      { type: "assistant" },
      { type: "file-history-snapshot" },
    ];
    expect(extractCwd(entries)).toBe("");
  });

  test("handles empty array", () => {
    expect(extractCwd([])).toBe("");
  });
});

describe("extractCheckpoints", () => {
  test("finds file-history-snapshot entries with files", () => {
    const entries = [
      { type: "user", message: "hello" },
      {
        type: "file-history-snapshot",
        messageId: "m1",
        snapshot: {
          trackedFileBackups: { "a.txt": { backupFileName: "abc@v1", version: 1, backupTime: "2025-01-01" } },
          timestamp: "2025-01-01T10:00:00Z",
        },
      },
      { type: "assistant", message: "hi" },
    ];
    const checkpoints = extractCheckpoints(entries);
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0].messageId).toBe("m1");
    expect(checkpoints[0].fileCount).toBe(1);
  });

  test("includes snapshots with empty trackedFileBackups (fileCount = 0)", () => {
    const entries = [
      {
        type: "file-history-snapshot",
        messageId: "m1",
        snapshot: { trackedFileBackups: {}, timestamp: "2025-01-01T10:00:00Z" },
      },
    ];
    const checkpoints = extractCheckpoints(entries);
    // Empty backups are still included, just with fileCount = 0
    expect(checkpoints).toHaveLength(1);
    expect(checkpoints[0].fileCount).toBe(0);
  });

  test("handles multiple checkpoints", () => {
    const entries = [
      {
        type: "file-history-snapshot",
        messageId: "m1",
        snapshot: {
          trackedFileBackups: { "a.txt": { backupFileName: "abc@v1", version: 1, backupTime: "2025-01-01" } },
          timestamp: "2025-01-01T10:00:00Z",
        },
      },
      {
        type: "file-history-snapshot",
        messageId: "m2",
        snapshot: {
          trackedFileBackups: {
            "b.txt": { backupFileName: "def@v1", version: 1, backupTime: "2025-01-01" },
            "c.txt": { backupFileName: "ghi@v1", version: 1, backupTime: "2025-01-01" },
          },
          timestamp: "2025-01-01T11:00:00Z",
        },
      },
    ];
    const checkpoints = extractCheckpoints(entries);
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[0].fileCount).toBe(1);
    expect(checkpoints[1].fileCount).toBe(2);
  });

  test("uses entry timestamp as fallback", () => {
    const entries = [
      {
        type: "file-history-snapshot",
        messageId: "m1",
        timestamp: "2025-01-01T09:00:00Z",
        snapshot: {
          trackedFileBackups: { "a.txt": { backupFileName: "abc@v1", version: 1, backupTime: "2025-01-01" } },
        },
      },
    ];
    const checkpoints = extractCheckpoints(entries);
    expect(checkpoints[0].timestamp).toBe("2025-01-01T09:00:00Z");
  });
});

describe("findCheckpointByMessageId", () => {
  const entries = [
    {
      type: "file-history-snapshot",
      messageId: "msg-001",
      snapshot: {
        trackedFileBackups: { "a.txt": { backupFileName: "abc@v1", version: 1, backupTime: "2025-01-01" } },
        timestamp: "2025-01-01T10:00:00Z",
      },
    },
    {
      type: "file-history-snapshot",
      messageId: "msg-002",
      snapshot: {
        trackedFileBackups: { "b.txt": { backupFileName: "def@v1", version: 1, backupTime: "2025-01-01" } },
        timestamp: "2025-01-01T11:00:00Z",
      },
    },
  ];

  test("finds checkpoint by message ID", () => {
    const checkpoint = findCheckpointByMessageId(entries, "msg-001");
    expect(checkpoint).not.toBeNull();
    expect(checkpoint?.messageId).toBe("msg-001");
    expect(checkpoint?.fileCount).toBe(1);
  });

  test("finds second checkpoint", () => {
    const checkpoint = findCheckpointByMessageId(entries, "msg-002");
    expect(checkpoint).not.toBeNull();
    expect(checkpoint?.messageId).toBe("msg-002");
  });

  test("returns null for non-existent ID", () => {
    const checkpoint = findCheckpointByMessageId(entries, "msg-999");
    expect(checkpoint).toBeNull();
  });

  test("returns null for empty entries", () => {
    const checkpoint = findCheckpointByMessageId([], "msg-001");
    expect(checkpoint).toBeNull();
  });
});

describe("extractConversationMetadata", () => {
  test("extracts git branch from user message", () => {
    const entries = [
      { type: "user", gitBranch: "main", message: "hello" },
      { type: "assistant", message: "hi" },
    ];
    const metadata = extractConversationMetadata(entries);
    expect(metadata.gitBranch).toBe("main");
  });

  test("returns first git branch found", () => {
    const entries = [
      { type: "user", gitBranch: "feature/first", message: "hello" },
      { type: "user", gitBranch: "feature/second", message: "world" },
    ];
    const metadata = extractConversationMetadata(entries);
    expect(metadata.gitBranch).toBe("feature/first");
  });

  test("returns undefined gitBranch when not present", () => {
    const entries = [
      { type: "user", message: "hello" },
      { type: "assistant", message: "hi" },
    ];
    const metadata = extractConversationMetadata(entries);
    expect(metadata.gitBranch).toBeUndefined();
  });

  test("counts unique files modified across checkpoints", () => {
    const entries = [
      {
        type: "file-history-snapshot",
        messageId: "m1",
        snapshot: {
          trackedFileBackups: { "a.txt": { backupFileName: "abc@v1", version: 1, backupTime: "2025-01-01" } },
          timestamp: "2025-01-01T10:00:00Z",
        },
      },
      {
        type: "file-history-snapshot",
        messageId: "m2",
        snapshot: {
          trackedFileBackups: {
            "a.txt": { backupFileName: "abc@v2", version: 2, backupTime: "2025-01-01" },
            "b.txt": { backupFileName: "def@v1", version: 1, backupTime: "2025-01-01" },
          },
          timestamp: "2025-01-01T11:00:00Z",
        },
      },
    ];
    const metadata = extractConversationMetadata(entries);
    // a.txt appears in both, b.txt only in second = 2 unique files
    expect(metadata.filesModified).toBe(2);
  });

  test("returns 0 files modified for empty checkpoints", () => {
    const entries = [
      { type: "user", message: "hello" },
      {
        type: "file-history-snapshot",
        messageId: "m1",
        snapshot: { trackedFileBackups: {}, timestamp: "2025-01-01T10:00:00Z" },
      },
    ];
    const metadata = extractConversationMetadata(entries);
    expect(metadata.filesModified).toBe(0);
  });

  test("handles empty entries array", () => {
    const metadata = extractConversationMetadata([]);
    expect(metadata.gitBranch).toBeUndefined();
    expect(metadata.filesModified).toBe(0);
  });

  test("extracts both gitBranch and filesModified", () => {
    const entries = [
      { type: "user", gitBranch: "develop", message: "hello" },
      {
        type: "file-history-snapshot",
        messageId: "m1",
        snapshot: {
          trackedFileBackups: {
            "src/index.ts": { backupFileName: "abc@v1", version: 1, backupTime: "2025-01-01" },
            "README.md": { backupFileName: "def@v1", version: 1, backupTime: "2025-01-01" },
          },
          timestamp: "2025-01-01T10:00:00Z",
        },
      },
    ];
    const metadata = extractConversationMetadata(entries);
    expect(metadata.gitBranch).toBe("develop");
    expect(metadata.filesModified).toBe(2);
  });
});
