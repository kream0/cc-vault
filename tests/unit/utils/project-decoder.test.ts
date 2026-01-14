import { describe, test, expect } from "bun:test";
import {
  decodeProjectName,
  encodeProjectName,
  getProjectDisplayName,
} from "../../../src/utils/project-decoder";

describe("decodeProjectName", () => {
  test("decodes path with leading dash", () => {
    const result = decodeProjectName("-mnt-c-Users-Karim-Documents");
    expect(result).toBe("/mnt/c/Users/Karim/Documents");
  });

  test("decodes home directory path", () => {
    const result = decodeProjectName("-home-karimel-project");
    expect(result).toBe("/home/karimel/project");
  });

  test("decodes path with underscore-prefixed directory (double dashes)", () => {
    const result = decodeProjectName("-mnt-c-Users-Karim-Documents-work--tools-AI");
    expect(result).toBe("/mnt/c/Users/Karim/Documents/work/_tools/AI");
  });

  test("decodes path with multiple underscore-prefixed directories", () => {
    const result = decodeProjectName("-home-user--private--config");
    expect(result).toBe("/home/user/_private/_config");
  });

  test("leaves non-encoded names unchanged", () => {
    const result = decodeProjectName("my-project");
    expect(result).toBe("my-project");
  });

  test("handles single component", () => {
    const result = decodeProjectName("-root");
    expect(result).toBe("/root");
  });
});

describe("encodeProjectName", () => {
  test("encodes Unix path", () => {
    const result = encodeProjectName("/mnt/c/Users/Karim/Documents");
    expect(result).toBe("-mnt-c-Users-Karim-Documents");
  });

  test("encodes home directory path", () => {
    const result = encodeProjectName("/home/karimel/project");
    expect(result).toBe("-home-karimel-project");
  });

  test("encodes path with underscore-prefixed directory", () => {
    const result = encodeProjectName("/mnt/c/Users/Karim/Documents/work/_tools/AI");
    expect(result).toBe("-mnt-c-Users-Karim-Documents-work--tools-AI");
  });

  test("encodes path with multiple underscore-prefixed directories", () => {
    const result = encodeProjectName("/home/user/_private/_config");
    expect(result).toBe("-home-user--private--config");
  });

  test("handles root path", () => {
    const result = encodeProjectName("/");
    expect(result).toBe("-");
  });
});

describe("getProjectDisplayName", () => {
  test("returns last component of decoded path", () => {
    const result = getProjectDisplayName("/mnt/c/Users/Karim/Documents");
    expect(result).toBe("Documents");
  });

  test("returns last component of simple path", () => {
    const result = getProjectDisplayName("/home/user/project");
    expect(result).toBe("project");
  });

  test("handles single component", () => {
    const result = getProjectDisplayName("/root");
    expect(result).toBe("root");
  });

  test("returns original if no slashes", () => {
    const result = getProjectDisplayName("project");
    expect(result).toBe("project");
  });

  test("handles empty string", () => {
    const result = getProjectDisplayName("");
    expect(result).toBe("");
  });
});
