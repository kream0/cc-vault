export interface FileBackup {
  backupFileName: string | null;
  version: number;
  backupTime: string;
}

export interface Checkpoint {
  messageId: string;
  timestamp: string;
  fileCount: number;
  files: Record<string, FileBackup>;
}

export interface CheckpointResponse {
  cwd: string;
  checkpoints: Checkpoint[];
}
