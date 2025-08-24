# Git Changelog System - Usage Examples

## Quick Start

### 1. Setup Database Tables

```bash
# Run the migration script to add Git changelog tables
cd packages/backend
npx tsx src/scripts/addGitChangelogTables.ts
```

### 2. Test the System

```bash
# Test all Git changelog features
npx tsx src/scripts/testGitChangelog.ts
```

## API Usage Examples

### Public Endpoints (No Authentication Required)

#### Get Changelog as JSON
```bash
# Get all published changelogs
curl -X GET "http://localhost:3000/api/git-changelogs/export/json"

# Get specific version
curl -X GET "http://localhost:3000/api/git-changelogs/export/json?version=v1.2.0"
```

#### Get Changelog as Markdown
```bash
# Get specific version as markdown
curl -X GET "http://localhost:3000/api/git-changelogs/markdown/v1.2.0"

# Get full changelog as markdown with metadata
curl -X GET "http://localhost:3000/api/git-changelogs/markdown?metadata=true&commits=true"
```

#### Get RSS Feed
```bash
# Get changelog as RSS feed
curl -X GET "http://localhost:3000/api/git-changelogs/export/rss"
```

### Admin Endpoints (Require Authentication)

#### Sync Git Commits
```bash
# Sync recent commits to database
curl -X POST "http://localhost:3000/api/git-changelogs/admin/sync-commits" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxCount": 50}'
```

#### Preview Changelog
```bash
# Preview changelog without creating it
curl -X POST "http://localhost:3000/api/git-changelogs/admin/preview" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "v1.3.0",
    "includeUnreleased": true
  }'
```

#### Generate Changelog
```bash
# Generate changelog from Git commits
curl -X POST "http://localhost:3000/api/git-changelogs/admin/generate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "v1.3.0",
    "title": "Release 1.3.0",
    "description": "New features and bug fixes",
    "releaseDate": "2024-01-15T00:00:00Z",
    "includeUnreleased": true
  }'
```

#### List Processed Commits
```bash
# Get all processed commits
curl -X GET "http://localhost:3000/api/git-changelogs/admin/commits?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by category
curl -X GET "http://localhost:3000/api/git-changelogs/admin/commits?category=feature&public=true" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Commit Properties
```bash
# Update commit categorization
curl -X PUT "http://localhost:3000/api/git-changelogs/admin/commits/abc123def" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "feature",
    "isPublic": true,
    "isBreakingChange": false
  }'
```

## Frontend Integration Examples

### Using the API Client

```typescript
import {
  generateGitChangelog,
  previewGitChangelog,
  syncGitCommits,
  getGitCommits,
  getChangelogMarkdown,
  exportChangelog
} from '../services/gitChangelogApi';

// Sync commits from Git
const syncResult = await syncGitCommits({ maxCount: 100 });
console.log(`Synced ${syncResult.syncedCount} commits`);

// Preview changelog
const preview = await previewGitChangelog({
  version: 'v1.3.0',
  includeUnreleased: true
});
console.log(`Preview: ${preview.stats.total} commits, ${preview.stats.public} public`);

// Generate changelog
const result = await generateGitChangelog({
  version: 'v1.3.0',
  title: 'Release 1.3.0',
  description: 'New features and improvements',
  includeUnreleased: true
});
console.log(`Created changelog with ${result.entriesCreated} entries`);

// Get markdown
const markdown = await getChangelogMarkdown('v1.3.0', {
  metadata: true,
  commits: true
});
console.log(markdown);
```

### React Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { getGitCommits, getCategoryInfo } from '../services/gitChangelogApi';

const GitCommitsManager: React.FC = () => {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCommits();
  }, []);

  const loadCommits = async () => {
    try {
      const result = await getGitCommits(1, 20, { public: true });
      setCommits(result.commits);
    } catch (error) {
      console.error('Failed to load commits:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading commits...</div>;

  return (
    <div className="git-commits-manager">
      <h2>Git Commits</h2>
      {commits.map((commit) => {
        const categoryInfo = getCategoryInfo(commit.category);
        return (
          <div key={commit.id} className="commit-item">
            <div className="commit-header">
              <span className="category">
                {categoryInfo.emoji} {categoryInfo.title}
              </span>
              <span className="hash">{commit.shortHash}</span>
            </div>
            <div className="commit-subject">{commit.subject}</div>
            <div className="commit-meta">
              <span>By {commit.author}</span>
              <span>{new Date(commit.date).toLocaleDateString()}</span>
              <span>+{commit.insertions} -{commit.deletions}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
```

## Programmatic Usage

### Direct Service Usage

```typescript
import { GitChangelogService } from './services/gitChangelogService';
import { ChangelogFormatterService } from './services/changelogFormatterService';

// Initialize services
const gitService = new GitChangelogService();
const formatter = new ChangelogFormatterService();

// Workflow example
async function createRelease() {
  // 1. Sync latest commits
  const syncedCount = await gitService.syncCommitsToDatabase({ maxCount: 50 });
  console.log(`Synced ${syncedCount} commits`);

  // 2. Preview what will be included
  const preview = await gitService.previewChangelog({
    version: 'v1.3.0',
    includeUnreleased: true
  });
  
  console.log('Preview stats:', preview.stats);
  
  // 3. Generate the changelog
  const result = await gitService.generateChangelogFromGit({
    version: 'v1.3.0',
    title: 'Release 1.3.0',
    description: 'New features and bug fixes',
    includeUnreleased: true
  }, userId);
  
  console.log(`Created changelog ${result.changelogId} with ${result.entriesCreated} entries`);
  
  // 4. Generate markdown output
  const markdown = await formatter.generateMarkdown('v1.3.0', {
    includeMetadata: true,
    includeCommitHashes: true,
    groupByCategory: true
  });
  
  console.log('Generated markdown:', markdown);
}
```

## Commit Message Best Practices

### Conventional Commits Format

```bash
# Features
git commit -m "feat: add vehicle comparison feature"
git commit -m "feat(search): implement advanced filtering"

# Bug fixes
git commit -m "fix: resolve image upload timeout"
git commit -m "fix(api): handle null vehicle data"

# Breaking changes
git commit -m "feat!: remove deprecated API endpoints"
git commit -m "fix!: change authentication flow"

# Other types
git commit -m "perf: optimize database queries"
git commit -m "docs: update API documentation"
git commit -m "test: add unit tests for search"
git commit -m "chore: update dependencies"
```

### Detailed Commit Messages

```bash
git commit -m "feat: add vehicle comparison feature

Allow users to compare up to 3 vehicles side by side.
Includes specifications, pricing, and performance metrics.

- Add comparison page with responsive design
- Implement vehicle selection modal
- Add comparison table with sortable columns
- Include charts for performance metrics

Closes #123
Fixes #456"
```

## Automation Examples

### GitHub Actions Workflow

```yaml
name: Generate Changelog
on:
  push:
    tags:
      - 'v*'

jobs:
  changelog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Generate changelog
        run: |
          curl -X POST "${{ secrets.API_URL }}/api/git-changelogs/admin/generate" \
            -H "Authorization: Bearer ${{ secrets.API_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "version": "${{ github.ref_name }}",
              "title": "Release ${{ github.ref_name }}",
              "includeUnreleased": true
            }'
```

### Scheduled Sync Script

```bash
#!/bin/bash
# sync-commits.sh - Run daily to sync Git commits

API_URL="http://localhost:3000/api"
TOKEN="your-jwt-token"

echo "Syncing Git commits..."
curl -X POST "$API_URL/git-changelogs/admin/sync-commits" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxCount": 100}'

echo "Sync completed!"
```

## Troubleshooting

### Common Issues and Solutions

**Issue: No commits found**
```bash
# Check if you're in a Git repository
git status

# Check recent commits
git log --oneline -10

# Test Git access from Node.js
npx tsx src/scripts/testGitChangelog.ts
```

**Issue: Authentication errors**
```bash
# Verify JWT token is valid
curl -X GET "http://localhost:3000/api/users/profile" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Issue: Categorization problems**
```bash
# Check commit message format
git log --oneline -5

# Test categorization
npx tsx -e "
import { CommitCategorizationService } from './src/services/commitCategorizationService';
const categorizer = new CommitCategorizationService();
const commit = { subject: 'your commit message here' };
console.log(categorizer.categorizeCommit(commit));
"
```

This comprehensive Git changelog system provides automated changelog generation while maintaining full backward compatibility with the existing manual system. The system intelligently categorizes commits, filters out maintenance tasks, and generates professional changelog output in multiple formats.
