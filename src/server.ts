import { serve, type Server } from "bun";
import type { AppConfig } from "./config";
import {
  handleGetProjects,
  handleGetConversations,
  handleGetCheckpoints,
  handleRestore,
  handleGetBlob,
  handleStaticFile,
  handleExportGlobal,
  handleExportProject,
  handleExportConversation,
  handleExportCheckpoint,
  handleImportGlobal,
  handleImportConversation,
  handleImportCheckpoint,
} from "./routes";

export function createServer(config: AppConfig): Server {
  const server = serve({
    port: config.port,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      // Static files
      if (path === "/" || path === "/index.html") {
        return handleStaticFile(path);
      }

      // API: List Projects
      if (path === "/api/projects" && req.method === "GET") {
        return handleGetProjects(config);
      }

      // API: List Conversations for a Project
      if (path.match(/^\/api\/projects\/[^/]+\/conversations$/) && req.method === "GET") {
        const projectId = path.split("/")[3];
        return handleGetConversations(config, projectId);
      }

      // API: Get Checkpoints for a Conversation
      if (path.match(/^\/api\/conversations\/[^/]+\/checkpoints$/) && req.method === "GET") {
        const conversationId = path.split("/")[3];
        const projectId = url.searchParams.get("projectId");
        return handleGetCheckpoints(config, conversationId, projectId);
      }

      // API: Get Blob (file preview)
      if (path === "/api/blob" && req.method === "GET") {
        return handleGetBlob(config, url);
      }

      // API: Restore
      if (path === "/api/restore" && req.method === "POST") {
        return handleRestore(config, req);
      }

      // API: Export - Global
      if (path === "/api/export/global" && req.method === "GET") {
        return handleExportGlobal(config);
      }

      // API: Export - Project
      if (path.match(/^\/api\/export\/projects\/[^/]+$/) && req.method === "GET") {
        const projectId = path.split("/")[4];
        return handleExportProject(config, projectId);
      }

      // API: Export - Conversation
      if (path.match(/^\/api\/export\/projects\/[^/]+\/conversations\/[^/]+$/) && req.method === "GET") {
        const parts = path.split("/");
        const projectId = parts[4];
        const conversationId = parts[6];
        return handleExportConversation(config, projectId, conversationId);
      }

      // API: Export - Checkpoint
      if (path === "/api/export/checkpoint" && req.method === "GET") {
        return handleExportCheckpoint(config, url);
      }

      // API: Import - Global
      if (path === "/api/import/global" && req.method === "POST") {
        return handleImportGlobal(config, req);
      }

      // API: Import - Conversation into a project
      if (path.match(/^\/api\/import\/projects\/[^/]+\/conversations$/) && req.method === "POST") {
        const projectId = path.split("/")[4];
        return handleImportConversation(config, projectId, req);
      }

      // API: Import - Checkpoint
      if (path === "/api/import/checkpoint" && req.method === "POST") {
        return handleImportCheckpoint(config, req);
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  return server;
}
