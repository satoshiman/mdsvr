# ADR-001: File-based content storage instead of database

## Status: Accepted

## Context

Documentation content needs to be stored and served efficiently. Common approaches include:
- Database storage (PostgreSQL, MongoDB, etc.)
- Headless CMS (Contentful, Strapi, etc.)
- File-based storage (Markdown files in filesystem)

Database solutions require:
- Database server setup and maintenance
- Migration scripts for schema changes
- Authentication and access control
- Backup and recovery procedures
- Additional infrastructure complexity

## Decision

Store all content as Markdown/MDX files in the filesystem. No database is used.

### Implementation

- Content files are stored directly in the docs directory
- File structure determines URL structure
- Frontmatter in files provides metadata
- Settings stored in `_mdsvr/settings.json`
- Export state stored in `_mdsvr/export-state.json`

## Consequences

### Positive

- **Zero setup**: No database server required, just Node.js
- **Git-friendly**: Content can be version controlled with Git
- **Portable**: Copy the entire directory to move or backup
- **Fast**: No database queries, direct file reads
- **Simple**: No ORM, no migrations, no connection pooling
- **Transparent**: Content is human-readable plain text
- **Offline editing**: Edit files directly with any text editor

### Negative

- **No query language**: Cannot run complex queries on content
- **No built-in search**: Must implement custom search (solved with search-index.json)
- **No user authentication**: Must implement at server level if needed
- **No content versioning**: Relies on Git for history
- **Scalability limits**: Filesystem performance at very large scale
- **No collaborative editing**: No real-time collaboration features

### Mitigations

- Search implemented via pre-built `/search-index.json`
- Authentication can be added via reverse proxy (nginx, etc.)
- Git provides content history and collaboration
- Static export enables CDN deployment for scale
