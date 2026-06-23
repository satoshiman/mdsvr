import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { promises as fs } from "node:fs";
import path from "node:path";
import { validateMarkdown } from "../src/validator/index.js";

describe("validator", () => {
  const testDir = path.join(process.cwd(), "test-fixtures-validator");

  // Cleanup before each test to ensure clean state
  beforeEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  it("should validate internal links", async () => {
    // Create test fixtures
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, "test1.md"),
      `---
title: Test 1
---

# Test 1

[Link to test2](test2.md)
[Link to missing](missing.md)
`,
      "utf-8",
    );
    await fs.writeFile(
      path.join(testDir, "test2.md"),
      `---
title: Test 2
---

# Test 2
`,
      "utf-8",
    );

    const result = await validateMarkdown({
      rootDir: testDir,
      autofix: false,
      checkLinks: true,
      checkStructure: false,
    });

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.errors.length >= 1, true);
    const missingError = result.errors.find((e) =>
      e.message.includes("missing.md"),
    );
    assert.ok(missingError);
    assert.strictEqual(missingError.type, "broken-link");

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should detect heading hierarchy issues", async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, "bad-headings.md"),
      `---
title: Bad Headings
---

# H1

### H3 (skipped H2)
`,
      "utf-8",
    );

    const result = await validateMarkdown({
      rootDir: testDir,
      autofix: false,
      checkLinks: false,
      checkStructure: true,
    });

    assert.strictEqual(result.valid, false);
    const headingError = result.errors.find(
      (e) => e.type === "heading-hierarchy",
    );
    assert.ok(headingError);
    assert.strictEqual(headingError.message.includes("H1 to H3"), true);

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it.skip("should autofix broken links", async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, "source.md"),
      `---
title: Source
---

# Source

[Link to target](traget.md)
`,
      "utf-8",
    );
    await fs.writeFile(
      path.join(testDir, "target.md"),
      `---
title: Target
---

# Target
`,
      "utf-8",
    );

    const result = await validateMarkdown({
      rootDir: testDir,
      autofix: true,
      checkLinks: true,
      checkStructure: false,
    });

    assert.strictEqual(result.fixed, 1);

    // Verify the fix
    const fixedContent = await fs.readFile(
      path.join(testDir, "source.md"),
      "utf-8",
    );
    assert.ok(fixedContent.includes("target.md"));
    assert.ok(!fixedContent.includes("traget.md"));

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should pass validation for valid markdown", async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, "valid.md"),
      `---
title: Valid
description: A valid markdown file
---

# Valid Heading

This is a valid markdown file with proper structure.

## Sub Heading

Proper heading hierarchy.

[Internal Link](valid.md)
`,
      "utf-8",
    );

    const result = await validateMarkdown({
      rootDir: testDir,
      autofix: false,
      checkLinks: true,
      checkStructure: true,
    });

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it("should skip external links", async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, "external.md"),
      `---
title: External Links
---

# External Links

[Google](https://google.com)
[GitHub](https://github.com)
`,
      "utf-8",
    );

    const result = await validateMarkdown({
      rootDir: testDir,
      autofix: false,
      checkLinks: true,
      checkStructure: false,
    });

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);

    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
  });
});
