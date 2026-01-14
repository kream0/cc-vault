export interface RestoreRequest {
  projectId: string;
  conversationId: string;
  checkpointMessageId: string;
  targetDir?: string;
  files?: string[];       // For selective restore - if provided, only restore these files
}

export interface RestoreResponse {
  success: boolean;
  count: number;
  files: string[];
  error?: string;
}
