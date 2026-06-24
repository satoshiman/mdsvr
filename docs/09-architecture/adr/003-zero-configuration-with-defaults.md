# ADR-003: Zero configuration with sensible defaults

## Status: Accepted

## Context

Documentation tools often require extensive configuration files (Docusaurus config.js, Nextra config, MkDocs config, etc.). This creates:
- Steep learning curve for new users
- Boilerplate setup time
- Configuration drift across projects
- Documentation maintenance burden
- Barrier to entry for simple use cases

Users want to serve documentation quickly without understanding complex configuration options.

## Decision

The system works without any configuration file. Sensible defaults are built-in. Optional `_mdsvr/settings.json` allows customization.

### Implementation

- All features work out-of-the-box with defaults
- `_mdsvr/settings.json` is optional
- Settings validated against Zod schema with JSON Schema reference
- Missing settings use defaults from `settings/defaults.ts`
- Settings hot-reloaded on file changes (no server restart)
- CLI `--init` generates starter settings file

### Default Behavior

- Port: 1800
- Theme: System preference (dark/light)
- Sidebar: Auto-generated from file structure
- Search: Enabled with client-side index
- MDX: Enabled
- SEO: OG images enabled
- Index files: README.md, index.md, index.html

## Consequences

### Positive

- **10-second setup**: Run `npx mdsvr ./docs` and it works
- **No learning curve**: Start using immediately, learn features later
- **Progressive enhancement**: Add configuration only when needed
- **Consistent defaults**: All projects start with best practices
- **Less maintenance**: No config file to update or break
- **Portable settings**: Copy docs folder, settings travel with it
- **Hot-reload**: Change settings without restarting server

### Negative

- **Less discoverability**: Users may not know customization options exist
- **Defaults may not fit all**: Some projects need different defaults
- **Schema complexity**: Validation errors can be confusing
- **Breaking changes**: Changing defaults affects existing users
- **Limited flexibility**: Some advanced features may require config

### Mitigations

- CLI `--init` generates documented starter config
- JSON Schema provides IDE autocomplete and validation
- Documentation clearly lists all options
- Settings hot-reload encourages experimentation
- Version defaults tied to package version
