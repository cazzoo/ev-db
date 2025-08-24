# Git Changelog Generation System

## Overview

The Git Changelog Generation System automatically creates changelog entries based on Git commit history using Drizzle ORM to store and manage changelog data. This system works alongside the existing manual changelog functionality to provide automated changelog generation with intelligent commit categorization and filtering.

## Features

- **Automatic Commit Parsing**: Extracts meaningful information from Git commit messages
- **Intelligent Categorization**: Categorizes commits (features, bug fixes, breaking changes, etc.)
- **Database Storage**: Stores changelog entries using Drizzle ORM schema
- **Multiple Output Formats**: Generates markdown, JSON, and RSS formats
- **Commit Filtering**: Excludes internal/maintenance commits from public changelogs
- **Version Management**: Supports versioning and release grouping
- **Conventional Commits**: Full support for conventional commit format
- **Backward Compatibility**: Works alongside existing manual changelog system

## Architecture

### Database Schema

#### Extended Tables
- **`changelog_entries`**: Extended with Git-related fields
  - `git_commit_hash`: Links to the source Git commit
  - `is_auto_generated`: Flags auto-generated vs manual entries

#### New Tables
- **`git_commits`**: Stores processed Git commit information
- **`commit_filters`**: Stores filtering rules for commit categorization

### Core Services

1. **GitCommitParser**: Parses Git commits using child_process
2. **CommitCategorizationService**: Categorizes and filters commits
3. **GitChangelogService**: Main service for Git-based changelog operations
4. **ChangelogFormatterService**: Generates formatted output

## Installation & Setup

### 1. Run Database Migration

```bash
# Add Git changelog tables to database
npx tsx src/scripts/addGitChangelogTables.ts
```

### 2. Test the System

```bash
# Test all Git changelog features
npx tsx src/scripts/testGitChangelog.ts
```

## Usage

### API Endpoints

#### Admin Endpoints (Require Admin Authentication)

**Generate Changelog from Git**
```http
POST /api/git-changelogs/admin/generate
Content-Type: application/json

{
  "version": "v1.2.0",
  "title": "Release 1.2.0",
  "description": "Major feature release with bug fixes",
  "releaseDate": "2024-01-15T00:00:00Z",
  "includeUnreleased": true
}
```

**Preview Changelog**
```http
POST /api/git-changelogs/admin/preview
Content-Type: application/json

{
  "version": "v1.2.0",
  "includeUnreleased": true
}
```

**Sync Git Commits**
```http
POST /api/git-changelogs/admin/sync-commits
Content-Type: application/json

{
  "since": "2024-01-01",
  "maxCount": 100
}
```

**List Processed Commits**
```http
GET /api/git-changelogs/admin/commits?page=1&limit=50&category=feature&public=true
```

**Update Commit Properties**
```http
PUT /api/git-changelogs/admin/commits/abc123def
Content-Type: application/json

{
  "category": "feature",
  "isPublic": true,
  "isBreakingChange": false
}
```

#### Public Endpoints

**Get Changelog as Markdown**
```http
GET /api/git-changelogs/markdown/v1.2.0?metadata=true&commits=true
```

**Get Full Changelog as Markdown**
```http
GET /api/git-changelogs/markdown?metadata=true&commits=true
```

**Export Changelog**
```http
GET /api/git-changelogs/export/json?version=v1.2.0
GET /api/git-changelogs/export/rss
GET /api/git-changelogs/export/markdown
```

### Programmatic Usage

```typescript
import { GitChangelogService } from './services/gitChangelogService';
import { ChangelogFormatterService } from './services/changelogFormatterService';

// Initialize services
const gitService = new GitChangelogService();
const formatter = new ChangelogFormatterService();

// Sync commits to database
await gitService.syncCommitsToDatabase({ maxCount: 50 });

// Generate changelog
const result = await gitService.generateChangelogFromGit({
  version: 'v1.2.0',
  title: 'Release 1.2.0',
  includeUnreleased: true
}, userId);

// Generate markdown output
const markdown = await formatter.generateMarkdown('v1.2.0', {
  includeMetadata: true,
  includeCommitHashes: true,
  groupByCategory: true
});
```

## Commit Categorization

### Conventional Commits Support

The system fully supports [Conventional Commits](https://www.conventionalcommits.org/) format:

- `feat: add new vehicle search feature` → **Feature**
- `fix: resolve image upload issue` → **Bug Fix**
- `perf: optimize database queries` → **Improvement**
- `docs: update API documentation` → **Documentation** (excluded from public)
- `chore: update dependencies` → **Chore** (excluded from public)
- `feat!: remove deprecated API` → **Breaking Change**

### Category Mapping

| Commit Type | Category | Public | Description |
|-------------|----------|--------|-------------|
| `feat`, `feature` | feature | ✅ | New features |
| `fix`, `bugfix` | bugfix | ✅ | Bug fixes |
| `perf`, `performance` | improvement | ✅ | Performance improvements |
| `refactor`, `style` | improvement | ✅ | Code improvements |
| `security` | security | ✅ | Security fixes |
| `deprecate` | deprecated | ✅ | Deprecations |
| `docs`, `documentation` | docs | ❌ | Documentation changes |
| `test`, `tests` | test | ❌ | Test changes |
| `chore`, `build`, `ci` | chore | ❌ | Maintenance tasks |

### Breaking Changes Detection

Breaking changes are detected through:
- `BREAKING CHANGE:` in commit message
- `!` in commit type (e.g., `feat!:`)
- Patterns like "remove API", "delete endpoint", etc.

## Filtering System

### Default Filters

The system includes default filters to exclude:
- Chore commits (`chore:`, `build:`, `ci:`)
- Documentation commits (`docs:`)
- Test commits (`test:`)
- Dependency updates
- Merge commits

### Custom Filters

Add custom filtering rules via the `commit_filters` table:

```sql
INSERT INTO commit_filters (name, description, pattern, filter_type, priority, is_active, created_at, updated_at)
VALUES ('Exclude WIP', 'Exclude work-in-progress commits', '^(wip|WIP):', 'exclude', 50, 1, datetime('now'), datetime('now'));
```

## Output Formats

### Markdown Format

```markdown
## [v1.2.0] - 2024-01-15

### 🚀 Features
- Add new vehicle search functionality
- Implement advanced filtering options

### 🐛 Bug Fixes  
- Fix image upload validation
- Resolve API rate limiting issues

### ⚡ Improvements
- Optimize database queries
- Enhance user interface responsiveness
```

### JSON Format

```json
{
  "version": "v1.2.0",
  "title": "Release 1.2.0",
  "releaseDate": "2024-01-15T00:00:00.000Z",
  "entries": [
    {
      "category": "feature",
      "title": "Add new vehicle search functionality",
      "description": "Implement comprehensive search with filters",
      "commitHash": "abc123def",
      "isAutoGenerated": true
    }
  ]
}
```

### RSS Format

Standard RSS 2.0 format for changelog feeds.

## Integration with Existing System

The Git changelog system is designed to work alongside the existing manual changelog system:

- **Backward Compatibility**: All existing manual changelogs remain functional
- **Mixed Entries**: Changelogs can contain both manual and auto-generated entries
- **Clear Identification**: Auto-generated entries are flagged with `is_auto_generated`
- **Override Capability**: Manual entries can override auto-generated ones

## Best Practices

### Commit Message Guidelines

For best results, follow these commit message guidelines:

```bash
# Good examples
git commit -m "feat: add vehicle comparison feature"
git commit -m "fix: resolve image upload timeout issue"
git commit -m "perf: optimize database query performance"
git commit -m "feat!: remove deprecated API endpoints"

# Include detailed descriptions
git commit -m "feat: add vehicle comparison feature

Allow users to compare up to 3 vehicles side by side.
Includes specifications, pricing, and performance metrics.

Closes #123"
```

### Version Management

- Use semantic versioning (v1.2.3)
- Tag releases consistently
- Include release notes in tag messages

### Workflow Integration

1. **Development**: Make commits following conventional format
2. **Pre-release**: Use preview endpoint to review changelog
3. **Release**: Generate changelog and publish
4. **Post-release**: Tag the release in Git

## Troubleshooting

### Common Issues

**No commits found**
- Ensure you're in a Git repository
- Check if commits exist since last release
- Verify Git is accessible from Node.js

**Categorization issues**
- Review commit message format
- Check filtering rules
- Update categorization patterns if needed

**Permission errors**
- Ensure proper admin authentication
- Check user permissions in database

### Debug Commands

```bash
# Test Git access
npx tsx src/scripts/testGitChangelog.ts

# Check database tables
sqlite3 sqlite.db ".schema git_commits"

# View processed commits
sqlite3 sqlite.db "SELECT * FROM git_commits LIMIT 10;"
```

## Performance Considerations

- **Batch Processing**: Commits are processed in batches
- **Indexing**: Database indexes optimize query performance
- **Caching**: Consider caching generated changelogs
- **Rate Limiting**: Git operations are not rate-limited but can be intensive

## Security Considerations

- **Admin Only**: Changelog generation requires admin privileges
- **Input Validation**: All inputs are validated
- **SQL Injection**: Drizzle ORM provides protection
- **Git Access**: Ensure secure Git repository access

## Future Enhancements

- **GitHub Integration**: Direct GitHub API integration
- **Custom Templates**: User-defined changelog templates
- **Automated Releases**: Trigger releases from changelogs
- **Webhook Support**: Notify external systems of new changelogs
- **Multi-repository**: Support for multiple Git repositories
