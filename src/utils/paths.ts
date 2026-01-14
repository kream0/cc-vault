import { join, resolve } from "path";
import { homedir } from "os";

/**
 * Expands ~ to user's home directory
 */
export function expandPath(p: string): string {
  if (p.startsWith("~")) {
    return join(homedir(), p.slice(1));
  }
  return p;
}

/**
 * Checks if the path contains path traversal sequences
 */
export function hasPathTraversal(targetPath: string): boolean {
  // Check for .. in the path
  return targetPath.includes("..");
}

/**
 * Checks if the path is inside the ~/.claude directory
 */
export function isClaudePath(targetPath: string): boolean {
  const expanded = expandPath(targetPath);
  const claudeDir = join(homedir(), ".claude");
  const normalized = resolve(expanded);
  return normalized.startsWith(claudeDir);
}

/**
 * Validates that a target directory is safe to write to.
 * Throws an error if the path is not safe.
 */
export function validateTargetDir(targetDir: string | undefined | null): void {
  if (!targetDir || typeof targetDir !== "string") {
    throw new Error("targetDir is required");
  }

  const expanded = expandPath(targetDir);

  // CRITICAL: Block writes to ~/.claude
  if (isClaudePath(expanded)) {
    throw new Error("Restore target cannot be inside ~/.claude directory - this is not allowed for safety");
  }

  // Block path traversal
  if (hasPathTraversal(expanded)) {
    throw new Error("Path traversal detected - '..' is not allowed in paths");
  }
}

/**
 * Safely resolves a file path relative to a target directory.
 * Handles both absolute and relative source paths.
 */
export function resolveRestorePath(
  filePath: string,
  targetDir: string,
  projectCwd: string
): string {
  if (filePath.startsWith("/")) {
    // Absolute path - rebase relative to targetDir
    if (projectCwd && filePath.startsWith(projectCwd)) {
      const rel = filePath.slice(projectCwd.length).replace(/^\//, "");
      return join(targetDir, rel);
    } else {
      // Strip leading slash to make relative
      return join(targetDir, filePath.replace(/^\//, ""));
    }
  } else {
    // Relative path - just join
    return join(targetDir, filePath);
  }
}
