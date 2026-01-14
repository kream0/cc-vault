import { readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { AppConfig } from "../config";
import type { Project } from "../types";
import { decodeProjectName } from "../utils/project-decoder";

export async function handleGetProjects(config: AppConfig): Promise<Response> {
  try {
    if (!existsSync(config.projectsRoot)) {
      return Response.json([]);
    }

    const entries = await readdir(config.projectsRoot, { withFileTypes: true });
    const projects: Project[] = entries
      .filter((e) => e.isDirectory())
      .map((e) => ({
        id: e.name,
        name: decodeProjectName(e.name),
        path: join(config.projectsRoot, e.name),
      }));

    return Response.json(projects);
  } catch (e) {
    return Response.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
