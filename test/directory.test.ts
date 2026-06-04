import { describe, it } from "node:test";
import assert from "node:assert";
import { renderDirectory } from "../dist/directory.js";

describe("directory", () => {
  it("renders directory listing with folders first", () => {
    const entries = [
      { name: "z-file.md", isDirectory: () => false, isFile: () => true, size: 100 } as unknown as import("node:fs").Dirent,
      { name: "a-folder", isDirectory: () => true, isFile: () => false, size: 0 } as unknown as import("node:fs").Dirent,
      { name: "b-file.txt", isDirectory: () => false, isFile: () => true, size: 50 } as unknown as import("node:fs").Dirent,
    ];

    const html = renderDirectory({ urlPath: "/docs", entries });
    
    // Should contain folder
    assert.ok(html.includes("a-folder"));
    // Should contain files
    assert.ok(html.includes("z-file.md"));
    assert.ok(html.includes("b-file.txt"));
    // Should have breadcrumb
    assert.ok(html.includes("docs"));
  });

  it("shows parent link for nested directories", () => {
    const entries: import("node:fs").Dirent[] = [];
    const html = renderDirectory({ urlPath: "/docs", entries });
    
    // Should have ../ link for nested dirs
    assert.ok(html.includes('../'));
  });

  it("handles empty directory", () => {
    const entries: import("node:fs").Dirent[] = [];
    const html = renderDirectory({ urlPath: "/", entries });
    
    // Root should not have parent link
    assert.ok(!html.includes('../') || html.includes("Empty directory"));
  });
});
