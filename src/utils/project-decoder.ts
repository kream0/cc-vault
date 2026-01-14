/**
 * Decodes a project directory name to a readable path.
 *
 * Claude encodes project paths as follows:
 * - '/' (path separator) becomes '-' (single dash)
 * - '/_' (path separator + underscore-prefixed folder) becomes '--' (double dash)
 * - '_' in the middle of folder names becomes '-' (lossy - cannot distinguish from '/')
 * - Special chars like '&' become '-' (single dash)
 *
 * e.g., "-mnt-c-Users-Karim-Documents-work--tools-AI" -> "/mnt/c/Users/Karim/Documents/work/_tools/AI"
 * e.g., "-home-user-scripts-img-to-pdf" -> "/home/user/scripts/img-to-pdf" (or could be img_to_pdf - lossy)
 */
export function decodeProjectName(encodedName: string): string {
  if (encodedName.startsWith("-")) {
    // Replace double dashes with /_  (underscore-prefixed directory)
    let decoded = encodedName.replace(/--/g, "/_");
    // Then replace remaining single dashes with slashes
    decoded = decoded.replace(/-/g, "/");
    return decoded;
  }
  return encodedName;
}

/**
 * Encodes a path to a project directory name.
 *
 * Claude encodes project paths as follows:
 * - '/_' (path separator + underscore-prefixed folder) becomes '--' (double dash)
 * - '/' (path separator) becomes '-' (single dash)
 * - Note: '_' in the middle of folder names also becomes '-' (lossy encoding)
 *
 * e.g., "/mnt/c/Users/Karim/Documents/work/_tools/AI" -> "-mnt-c-Users-Karim-Documents-work--tools-AI"
 */
export function encodeProjectName(path: string): string {
  // First encode /_  as double dashes (underscore-prefixed directories)
  let encoded = path.replace(/\/_/g, "--");
  // Then encode remaining slashes as single dashes
  encoded = encoded.replace(/\//g, "-");
  return encoded;
}

/**
 * Extracts the last component of a project path for display
 */
export function getProjectDisplayName(decodedPath: string): string {
  const parts = decodedPath.split("/").filter(Boolean);
  return parts[parts.length - 1] || decodedPath;
}
