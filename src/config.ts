import { join } from "path";
import { homedir } from "os";

export interface AppConfig {
  claudeRoot: string;
  projectsRoot: string;
  historyRoot: string;
  port: number;
}

export function parseCliArgs(): Partial<AppConfig> {
  const args = Bun.argv.slice(2);
  const config: Partial<AppConfig> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--port" && args[i + 1]) {
      config.port = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--claude-root" && args[i + 1]) {
      config.claudeRoot = args[i + 1];
      i++;
    } else if (arg.startsWith("--port=")) {
      config.port = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--claude-root=")) {
      config.claudeRoot = arg.split("=")[1];
    }
  }

  return config;
}

export function createConfig(options: Partial<AppConfig> = {}): AppConfig {
  const claudeRoot = options.claudeRoot ?? join(homedir(), ".claude");
  return {
    claudeRoot,
    projectsRoot: join(claudeRoot, "projects"),
    historyRoot: join(claudeRoot, "file-history"),
    port: options.port ?? 3000,
  };
}

// Default configuration (can be overridden for testing)
let currentConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!currentConfig) {
    const cliArgs = parseCliArgs();
    currentConfig = createConfig(cliArgs);
  }
  return currentConfig;
}

export function setConfig(config: AppConfig): void {
  currentConfig = config;
}

export function resetConfig(): void {
  currentConfig = null;
}
