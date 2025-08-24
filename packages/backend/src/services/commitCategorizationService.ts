import { GitCommit } from './gitCommitParser';

export type CommitCategory = 'feature' | 'bugfix' | 'improvement' | 'breaking' | 'security' | 'deprecated' | 'chore' | 'docs' | 'test';

export interface CategorizedCommit extends GitCommit {
  category: CommitCategory;
  isBreakingChange: boolean;
  isPublic: boolean; // Should be included in public changelog
  cleanTitle: string; // Cleaned up title for changelog
  cleanDescription?: string; // Cleaned up description
}

export interface CategorizationRule {
  pattern: RegExp;
  category: CommitCategory;
  isPublic: boolean;
  priority: number;
}

export class CommitCategorizationService {
  private static readonly DEFAULT_RULES: CategorizationRule[] = [
    // Breaking changes (highest priority)
    { pattern: /BREAKING CHANGE/i, category: 'breaking', isPublic: true, priority: 100 },
    { pattern: /^[^:]*!:/i, category: 'breaking', isPublic: true, priority: 99 },
    
    // Security fixes
    { pattern: /^(security|sec)(\([^)]*\))?:/i, category: 'security', isPublic: true, priority: 90 },
    { pattern: /\b(security|vulnerability|exploit|cve)\b/i, category: 'security', isPublic: true, priority: 89 },
    
    // Features
    { pattern: /^(feat|feature)(\([^)]*\))?:/i, category: 'feature', isPublic: true, priority: 80 },
    { pattern: /^(add|implement|introduce)(\([^)]*\))?:/i, category: 'feature', isPublic: true, priority: 79 },
    
    // Bug fixes
    { pattern: /^(fix|bugfix)(\([^)]*\))?:/i, category: 'bugfix', isPublic: true, priority: 70 },
    { pattern: /^(resolve|correct)(\([^)]*\))?:/i, category: 'bugfix', isPublic: true, priority: 69 },
    
    // Improvements and performance
    { pattern: /^(perf|performance)(\([^)]*\))?:/i, category: 'improvement', isPublic: true, priority: 60 },
    { pattern: /^(improve|enhance|optimize)(\([^)]*\))?:/i, category: 'improvement', isPublic: true, priority: 59 },
    { pattern: /^(refactor|style)(\([^)]*\))?:/i, category: 'improvement', isPublic: true, priority: 58 },
    
    // Deprecations
    { pattern: /^(deprecate|deprecated)(\([^)]*\))?:/i, category: 'deprecated', isPublic: true, priority: 50 },
    
    // Documentation (usually not public)
    { pattern: /^(docs?|documentation)(\([^)]*\))?:/i, category: 'docs', isPublic: false, priority: 40 },
    
    // Tests (not public)
    { pattern: /^(test|tests?)(\([^)]*\))?:/i, category: 'test', isPublic: false, priority: 30 },
    
    // Chores and maintenance (not public)
    { pattern: /^(chore|build|ci|cd)(\([^)]*\))?:/i, category: 'chore', isPublic: false, priority: 20 },
    { pattern: /^(update|upgrade|bump)(\([^)]*\))?\s+(dependencies|deps|version)/i, category: 'chore', isPublic: false, priority: 19 },
    { pattern: /^(merge|revert)(\([^)]*\))?:/i, category: 'chore', isPublic: false, priority: 18 },
    
    // Default fallback for conventional commits
    { pattern: /^[a-z]+(\([^)]*\))?:/i, category: 'improvement', isPublic: true, priority: 10 },
  ];

  private rules: CategorizationRule[];

  constructor(customRules: CategorizationRule[] = []) {
    // Combine custom rules with default rules, sorted by priority (descending)
    this.rules = [...customRules, ...CommitCategorizationService.DEFAULT_RULES]
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Categorize a single commit
   */
  categorizeCommit(commit: GitCommit): CategorizedCommit {
    const category = this.determineCategory(commit);
    const isBreakingChange = this.isBreakingChange(commit);
    const isPublic = this.shouldBePublic(commit, category);
    const { cleanTitle, cleanDescription } = this.cleanCommitMessage(commit);

    return {
      ...commit,
      category,
      isBreakingChange,
      isPublic,
      cleanTitle,
      cleanDescription,
    };
  }

  /**
   * Categorize multiple commits
   */
  categorizeCommits(commits: GitCommit[]): CategorizedCommit[] {
    return commits.map(commit => this.categorizeCommit(commit));
  }

  /**
   * Filter commits for public changelog
   */
  filterForPublicChangelog(commits: CategorizedCommit[]): CategorizedCommit[] {
    return commits.filter(commit => commit.isPublic);
  }

  /**
   * Group commits by category
   */
  groupByCategory(commits: CategorizedCommit[]): Record<CommitCategory, CategorizedCommit[]> {
    const groups: Record<CommitCategory, CategorizedCommit[]> = {
      feature: [],
      bugfix: [],
      improvement: [],
      breaking: [],
      security: [],
      deprecated: [],
      chore: [],
      docs: [],
      test: [],
    };

    for (const commit of commits) {
      groups[commit.category].push(commit);
    }

    return groups;
  }

  /**
   * Determine the category of a commit based on rules
   */
  private determineCategory(commit: GitCommit): CommitCategory {
    const message = commit.message;
    const subject = commit.subject;

    // Check against all rules in priority order
    for (const rule of this.rules) {
      if (rule.pattern.test(subject) || rule.pattern.test(message)) {
        return rule.category;
      }
    }

    // Default fallback
    return 'improvement';
  }

  /**
   * Check if a commit represents a breaking change
   */
  private isBreakingChange(commit: GitCommit): boolean {
    const message = commit.message.toLowerCase();
    const subject = commit.subject.toLowerCase();

    // Check for explicit breaking change indicators
    if (message.includes('breaking change') || 
        message.includes('breaking:') ||
        subject.includes('!:')) {
      return true;
    }

    // Check for common breaking change patterns
    const breakingPatterns = [
      /\bremove\b.*\bapi\b/i,
      /\bdelete\b.*\bendpoint\b/i,
      /\bdrop\b.*\bsupport\b/i,
      /\bchange\b.*\binterface\b/i,
      /\bmodify\b.*\bschema\b/i,
    ];

    return breakingPatterns.some(pattern => 
      pattern.test(subject) || pattern.test(message)
    );
  }

  /**
   * Determine if a commit should be included in public changelog
   */
  private shouldBePublic(commit: GitCommit, category: CommitCategory): boolean {
    // Find the matching rule
    for (const rule of this.rules) {
      if (rule.pattern.test(commit.subject) || rule.pattern.test(commit.message)) {
        return rule.isPublic;
      }
    }

    // Default based on category
    const publicCategories: CommitCategory[] = ['feature', 'bugfix', 'improvement', 'breaking', 'security', 'deprecated'];
    return publicCategories.includes(category);
  }

  /**
   * Clean up commit message for changelog display
   */
  private cleanCommitMessage(commit: GitCommit): { cleanTitle: string; cleanDescription?: string } {
    let cleanTitle = commit.subject;
    let cleanDescription = commit.body;

    // Remove conventional commit prefixes
    cleanTitle = cleanTitle.replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, '');
    
    // Capitalize first letter
    cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    
    // Remove trailing periods
    cleanTitle = cleanTitle.replace(/\.$/, '');

    // Clean up description
    if (cleanDescription) {
      // Remove "BREAKING CHANGE:" sections as they're handled separately
      cleanDescription = cleanDescription.replace(/BREAKING CHANGE:.*$/gim, '').trim();
      
      // If description is empty after cleaning, set to undefined
      if (!cleanDescription) {
        cleanDescription = undefined;
      }
    }

    return { cleanTitle, cleanDescription };
  }

  /**
   * Add custom categorization rule
   */
  addRule(rule: CategorizationRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get category display information
   */
  static getCategoryInfo(category: CommitCategory): { emoji: string; title: string; order: number } {
    const categoryInfo = {
      breaking: { emoji: '💥', title: 'Breaking Changes', order: 1 },
      security: { emoji: '🔒', title: 'Security', order: 2 },
      feature: { emoji: '🚀', title: 'Features', order: 3 },
      bugfix: { emoji: '🐛', title: 'Bug Fixes', order: 4 },
      improvement: { emoji: '⚡', title: 'Improvements', order: 5 },
      deprecated: { emoji: '⚠️', title: 'Deprecated', order: 6 },
      docs: { emoji: '📚', title: 'Documentation', order: 7 },
      test: { emoji: '🧪', title: 'Tests', order: 8 },
      chore: { emoji: '🔧', title: 'Maintenance', order: 9 },
    };

    return categoryInfo[category] || { emoji: '📝', title: 'Other', order: 10 };
  }
}
