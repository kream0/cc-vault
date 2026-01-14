export interface Project {
  id: string;           // Directory name (e.g., "-mnt-c-Users-Karim-...")
  name: string;         // Decoded path (e.g., "/mnt/c/Users/Karim/...")
  path: string;         // Full filesystem path to the project directory
}
