import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: Date;
  message: string;
  subject: string;
  body?: string;
  filesChanged: string[];
  insertions: number;
  deletions: number;
}

export interface GitTag {
  name: string;
  hash: string;
  date: Date;
  message?: string;
  author?: string;
  authorEmail?: string;
}

export interface GitCommitParseOptions {
  since?: string; // Date or commit hash
  until?: string; // Date or commit hash
  maxCount?: number;
  includeMerges?: boolean;
  author?: string;
  grep?: string; // Grep pattern for commit messages
}

export class GitCommitParser {
  private repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
  }

  /**
   * Parse Git commits from the repository
   */
  async parseCommits(options: GitCommitParseOptions = {}): Promise<GitCommit[]> {
    try {
      const gitLogCommand = this.buildGitLogCommand(options);
      const { stdout } = await execAsync(gitLogCommand, { cwd: this.repoPath });

      if (!stdout.trim()) {
        return [];
      }

      return this.parseGitLogOutput(stdout);
    } catch (error) {
      console.error('Error parsing Git commits:', error);
      throw new Error(`Failed to parse Git commits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get commits since the last release tag
   */
  async getCommitsSinceLastRelease(): Promise<GitCommit[]> {
    try {
      // Get the latest release tag
      const { stdout: tagOutput } = await execAsync(
        'git describe --tags --abbrev=0 --match="v*" 2>/dev/null || echo ""',
        { cwd: this.repoPath }
      );

      const lastTag = tagOutput.trim();
      const since = lastTag || undefined; // If no tags, get all commits

      return this.parseCommits({
        since,
        includeMerges: false,
      });
    } catch (error) {
      console.error('Error getting commits since last release:', error);
      // Fallback to recent commits if tag parsing fails
      return this.parseCommits({
        maxCount: 50,
        includeMerges: false,
      });
    }
  }

  /**
   * Get commits between two references (tags, branches, commits)
   */
  async getCommitsBetween(from: string, to: string = 'HEAD'): Promise<GitCommit[]> {
    return this.parseCommits({
      since: from,
      until: to,
      includeMerges: false,
    });
  }

  /**
   * Build the git log command with options
   */
  private buildGitLogCommand(options: GitCommitParseOptions): string {
    const parts = ['git log'];

    // Custom format for parsing
    parts.push('--pretty=format:"COMMIT_START%n%H%n%h%n%an%n%ae%n%ai%n%s%n%b%nCOMMIT_END"');

    // Add numstat for file changes
    parts.push('--numstat');

    if (options.maxCount) {
      parts.push(`-n ${options.maxCount}`);
    }

    if (options.since) {
      parts.push(`--since="${options.since}"`);
    }

    if (options.until) {
      parts.push(`--until="${options.until}"`);
    }

    if (!options.includeMerges) {
      parts.push('--no-merges');
    }

    if (options.author) {
      parts.push(`--author="${options.author}"`);
    }

    if (options.grep) {
      parts.push(`--grep="${options.grep}"`);
    }

    return parts.join(' ');
  }

  /**
   * Parse the output from git log command
   */
  private parseGitLogOutput(output: string): GitCommit[] {
    const commits: GitCommit[] = [];
    const commitBlocks = output.split('COMMIT_START').filter(block => block.trim());

    for (const block of commitBlocks) {
      try {
        const commit = this.parseCommitBlock(block);
        if (commit) {
          commits.push(commit);
        }
      } catch (error) {
        console.warn('Failed to parse commit block:', error);
        continue;
      }
    }

    return commits;
  }

  /**
   * Parse a single commit block
   */
  private parseCommitBlock(block: string): GitCommit | null {
    const lines = block.split('\n');
    let lineIndex = 0;

    // Skip empty lines
    while (lineIndex < lines.length && !lines[lineIndex].trim()) {
      lineIndex++;
    }

    if (lineIndex >= lines.length) {
      return null;
    }

    // Parse commit info
    const hash = lines[lineIndex++]?.trim();
    const shortHash = lines[lineIndex++]?.trim();
    const author = lines[lineIndex++]?.trim();
    const authorEmail = lines[lineIndex++]?.trim();
    const dateStr = lines[lineIndex++]?.trim();
    const subject = lines[lineIndex++]?.trim();

    if (!hash || !shortHash || !author || !authorEmail || !dateStr || !subject) {
      return null;
    }

    // Parse body (everything until COMMIT_END or numstat)
    const bodyLines: string[] = [];
    while (lineIndex < lines.length &&
           !lines[lineIndex].includes('COMMIT_END') &&
           !this.isNumStatLine(lines[lineIndex])) {
      bodyLines.push(lines[lineIndex]);
      lineIndex++;
    }

    const body = bodyLines.join('\n').trim() || undefined;

    // Parse file changes (numstat format)
    const filesChanged: string[] = [];
    let insertions = 0;
    let deletions = 0;

    while (lineIndex < lines.length && !lines[lineIndex].includes('COMMIT_END')) {
      const line = lines[lineIndex].trim();
      if (this.isNumStatLine(line)) {
        const [addStr, delStr, filename] = line.split('\t');
        const add = addStr === '-' ? 0 : parseInt(addStr, 10) || 0;
        const del = delStr === '-' ? 0 : parseInt(delStr, 10) || 0;

        insertions += add;
        deletions += del;

        if (filename) {
          filesChanged.push(filename);
        }
      }
      lineIndex++;
    }

    return {
      hash,
      shortHash,
      author,
      authorEmail,
      date: new Date(dateStr),
      message: subject + (body ? '\n\n' + body : ''),
      subject,
      body,
      filesChanged,
      insertions,
      deletions,
    };
  }

  /**
   * Check if a line is in numstat format (additions\tdeletions\tfilename)
   */
  private isNumStatLine(line: string): boolean {
    const parts = line.split('\t');
    return parts.length === 3 &&
           (parts[0] === '-' || !isNaN(parseInt(parts[0], 10))) &&
           (parts[1] === '-' || !isNaN(parseInt(parts[1], 10)));
  }

  /**
   * Get the current repository's remote URL
   */
  async getRepositoryUrl(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git config --get remote.origin.url', { cwd: this.repoPath });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Get the current branch name
   */
  async getCurrentBranch(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: this.repoPath });
      return stdout.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if the repository has uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: this.repoPath });
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get all git tags from the repository
   */
  async getAllTags(): Promise<GitTag[]> {
    try {
      const { stdout } = await execAsync(
        'git tag -l --sort=-version:refname --format="%(refname:short)%09%(objectname)%09%(creatordate:iso8601)%09%(subject)"',
        { cwd: this.repoPath }
      );

      if (!stdout.trim()) {
        return [];
      }

      const tags: GitTag[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        const [name, hash, dateStr, message] = line.split('\t');
        if (name && hash && dateStr) {
          tags.push({
            name,
            hash,
            date: new Date(dateStr),
            message: message || undefined,
          });
        }
      }

      return tags;
    } catch (error) {
      console.warn('Could not fetch git tags:', error);
      return [];
    }
  }

  /**
   * Get the latest git tag
   */
  async getLatestTag(): Promise<GitTag | null> {
    try {
      const tags = await this.getAllTags();
      return tags.length > 0 ? tags[0] : null;
    } catch {
      return null;
    }
  }

  /**
   * Get commits between two tags or between a tag and HEAD
   */
  async getCommitsBetweenTags(fromTag?: string, toTag: string = 'HEAD'): Promise<GitCommit[]> {
    try {
      let gitCommand: string;

      if (fromTag && toTag !== 'HEAD') {
        // Between two specific tags
        gitCommand = `git log --reverse --no-merges ${fromTag}..${toTag}`;
      } else if (fromTag) {
        // From a tag to HEAD
        gitCommand = `git log --reverse --no-merges ${fromTag}..HEAD`;
      } else {
        // From beginning to a specific tag
        gitCommand = `git log --reverse --no-merges ${toTag}`;
      }

      // Use the same format as parseCommits
      gitCommand += ' --pretty=format:"COMMIT_START%n%H%n%h%n%an%n%ae%n%ai%n%s%n%b%nCOMMIT_END" --numstat';

      const { stdout } = await execAsync(gitCommand, { cwd: this.repoPath });

      if (!stdout.trim()) {
        return [];
      }

      return this.parseGitLogOutput(stdout);
    } catch (error) {
      console.error('Error getting commits between tags:', error);
      return [];
    }
  }

  /**
   * Get a single commit by its hash
   */
  async getCommitByHash(hash: string): Promise<GitCommit | null> {
    try {
      const gitCommand = `git log --no-merges -1 ${hash} --pretty=format:"COMMIT_START%n%H%n%h%n%an%n%ae%n%ai%n%s%n%b%nCOMMIT_END" --numstat`;
      const { stdout } = await execAsync(gitCommand, { cwd: this.repoPath });

      if (!stdout.trim()) {
        return null;
      }

      const commits = this.parseGitLogOutput(stdout);
      return commits.length > 0 ? commits[0] : null;
    } catch {
      return null;
    }
  }
}
