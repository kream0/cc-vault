export interface Conversation {
  id: string;           // UUID (filename without .jsonl)
  filename: string;     // Full filename with extension
  mtime: Date;          // Last modified time
  gitBranch?: string;   // Git branch from the conversation (if available)
  filesModified?: number; // Count of unique files modified across all checkpoints
}
