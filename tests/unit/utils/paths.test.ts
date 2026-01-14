import { describe, test, expect } from "bun:test";
import {
  expandPath,
  hasPathTraversal,
  isClaudePath,
  validateTargetDir,
  resolveRestorePath,
} from "../../../src/utils/paths";
import { homedir } from "os";
import { join } from "path";

describe("expandPath", () => {
  test("expands ~ to home directory", () => {
    const result = expandPath("~/Documents");
    expect(result).toBe(join(homedir(), "Documents"));
  });

  test("expands ~/ at start of path", () => {
    const result = expandPath("~/foo/bar");
    expect(result).toBe(join(homedir(), "foo/bar"));
  });

  test("leaves absolute paths unchanged", () => {
    expect(expandPath("/absolute/path")).toBe("/absolute/path");
  });

  test("leaves relative paths unchanged", () => {
    expect(expandPath("relative/path")).toBe("relative/path");
  });

  test("handles ~ alone", () => {
    const result = expandPath("~");
    expect(result).toBe(homedir());
  });
});

describe("hasPathTraversal", () => {
  test("detects .. in path", () => {
    expect(hasPathTraversal("/safe/path/../../../etc/passwd")).toBe(true);
  });

  test("detects .. at start", () => {
    expect(hasPathTraversal("../etc/passwd")).toBe(true);
  });

  test("detects .. at end", () => {
    expect(hasPathTraversal("/some/path/..")).toBe(true);
  });

  test("allows normal paths", () => {
    expect(hasPathTraversal("/home/user/project")).toBe(false);
  });

  test("allows paths without ..", () => {
    expect(hasPathTraversal("/a/b/c/d/e")).toBe(false);
  });
});

describe("isClaudePath", () => {
  test("detects ~/.claude path", () => {
    expect(isClaudePath("~/.claude/projects")).toBe(true);
  });

  test("detects expanded ~/.claude path", () => {
    const claudePath = join(homedir(), ".claude", "projects");
    expect(isClaudePath(claudePath)).toBe(true);
  });

  test("detects nested ~/.claude paths", () => {
    expect(isClaudePath("~/.claude/file-history/abc")).toBe(true);
  });

  test("allows non-claude paths", () => {
    expect(isClaudePath("/tmp/restore")).toBe(false);
  });

  test("allows home directory without .claude", () => {
    expect(isClaudePath("~/Documents")).toBe(false);
  });
});

describe("validateTargetDir", () => {
  test("throws for null targetDir", () => {
    expect(() => validateTargetDir(null)).toThrow("targetDir is required");
  });

  test("throws for undefined targetDir", () => {
    expect(() => validateTargetDir(undefined)).toThrow("targetDir is required");
  });

  test("throws for empty string", () => {
    expect(() => validateTargetDir("")).toThrow("targetDir is required");
  });

  test("throws for ~/.claude paths", () => {
    expect(() => validateTargetDir("~/.claude/restore")).toThrow(
      "Restore target cannot be inside ~/.claude directory"
    );
  });

  test("throws for path traversal", () => {
    expect(() => validateTargetDir("/tmp/../../../etc")).toThrow(
      "Path traversal detected"
    );
  });

  test("allows valid paths", () => {
    expect(() => validateTargetDir("/tmp/restore")).not.toThrow();
  });

  test("allows home directory paths", () => {
    expect(() => validateTargetDir("~/Documents/restore")).not.toThrow();
  });
});

describe("resolveRestorePath", () => {
  test("handles relative paths", () => {
    const result = resolveRestorePath("src/index.ts", "/target", "/project");
    expect(result).toBe("/target/src/index.ts");
  });

  test("rebases absolute paths within project cwd", () => {
    const result = resolveRestorePath(
      "/project/src/index.ts",
      "/target",
      "/project"
    );
    expect(result).toBe("/target/src/index.ts");
  });

  test("handles absolute paths outside project cwd", () => {
    const result = resolveRestorePath(
      "/other/file.ts",
      "/target",
      "/project"
    );
    expect(result).toBe("/target/other/file.ts");
  });

  test("handles empty project cwd", () => {
    const result = resolveRestorePath(
      "/some/path/file.ts",
      "/target",
      ""
    );
    expect(result).toBe("/target/some/path/file.ts");
  });

  test("handles Windows absolute paths with drive letter", () => {
    const result = resolveRestorePath(
      "C:\\Users\\Test\\project\\src\\index.ts",
      "/target",
      ""
    );
    // Should strip drive letter and make relative
    expect(result).toContain("target");
    expect(result).toContain("Users");
  });

  test("handles mixed path separators", () => {
    const result = resolveRestorePath(
      "src\\components\\App.tsx",
      "/target",
      "/project"
    );
    expect(result).toContain("target");
    expect(result).toContain("src");
  });
});

describe("isClaudePath - cross-platform", () => {
  test("case-insensitive comparison on paths", () => {
    // This tests that .Claude and .claude are both detected
    const claudePathLower = join(homedir(), ".claude", "projects");
    expect(isClaudePath(claudePathLower)).toBe(true);
  });
});
