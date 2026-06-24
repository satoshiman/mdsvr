# ADR-006: Markdown validation and auto-fixing

## Status: Accepted

## Context

Documentation sites often have markdown quality issues that affect user experience:
- Broken internal and external links
- Missing or invalid frontmatter
- Inconsistent heading hierarchy
- Empty sections or orphaned headings
- Duplicate anchors
- Malformed markdown syntax

Common approaches to handle this:
- **Manual review**: Time-consuming, error-prone
- **CI/CD linting**: Blocks deployment, requires fixes
- **Runtime errors**: Poor user experience
- **Ignore issues**: Accumulates technical debt

Users need a way to detect and fix markdown issues before deployment.

## Decision

Implement markdown validation with optional auto-fixing via CLI commands `--validate-md` and `--autofix`.

### Implementation

- **Validator module** (`validator/index.ts`) checks all markdown files
- **Validation checks**:
  - Broken internal links (point to non-existent files)
  - Broken external links (HTTP HEAD request)
  - Missing or invalid frontmatter
  - Inconsistent heading hierarchy (skipped levels)
  - Empty sections (headings with no content)
  - Duplicate anchors (same heading text)
  - Malformed markdown syntax
- **Auto-fix capabilities**:
  - Add missing frontmatter with defaults
  - Fix heading hierarchy (renumber levels)
  - Remove empty sections
  - Fix duplicate anchors (add suffixes)
  - Fix common syntax errors
- **CLI integration**: `--validate-md` to check, `--autofix` to fix

## Consequences

### Positive

- **Quality assurance**: Catches issues before deployment
- **Developer-friendly**: Auto-fix reduces manual work
- **Consistent**: Enforces markdown standards across project
- **Prevents broken links**: Detects broken internal/external links
- **Better UX**: Users see well-formatted documentation
- **CI/CD ready**: Can be integrated in build pipeline

### Negative

- **False positives**: May flag intentional deviations
- **Auto-fix risk**: Automatic changes may not be desired
- **External link checks**: Requires network, can be slow
- **Limited scope**: Cannot catch all markdown issues
- **Opinionated**: Enforces specific style (heading hierarchy, etc.)

### Mitigations

- Validation is optional (not required for serving)
- Auto-fix requires explicit `--autofix` flag
- External link checks can be disabled
- Validation rules are documented
- Users can review changes before committing
- False positives can be ignored manually
