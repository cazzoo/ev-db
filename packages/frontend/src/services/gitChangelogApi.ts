// Get auth token from localStorage
const getAuthToken = (): string => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Types for Git changelog management
export interface GenerateGitChangelogRequest {
  version?: string;
  title?: string;
  description?: string;
  releaseDate?: string;
  includeUnreleased?: boolean;
}

export interface SyncCommitsRequest {
  since?: string;
  maxCount?: number;
}

export interface UpdateCommitRequest {
  category?: 'feature' | 'bugfix' | 'improvement' | 'breaking' | 'security' | 'deprecated' | 'chore' | 'docs' | 'test';
  isPublic?: boolean;
  isBreakingChange?: boolean;
}

export interface GitCommit {
  id: number;
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: string;
  message: string;
  subject: string;
  body?: string;
  filesChanged: string[];
  insertions: number;
  deletions: number;
  category?: string;
  isBreakingChange: boolean;
  isPublic: boolean;
  processedAt: string;
  version?: string;
  createdAt: string;
}

export interface ChangelogPreview {
  commits: any[];
  groupedCommits: Record<string, any[]>;
  stats: {
    total: number;
    public: number;
    byCategory: Record<string, number>;
  };
}

export interface GenerateChangelogResult {
  changelogId: number;
  entriesCreated: number;
  commitsProcessed: number;
  commitsSkipped: number;
}

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
};

// Admin API functions (require authentication)

// Generate changelog from Git commits
export const generateGitChangelog = async (data: GenerateGitChangelogRequest): Promise<GenerateChangelogResult> => {
  const response = await fetch(`${API_URL}/git-changelogs/admin/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Preview changelog without creating it
export const previewGitChangelog = async (data: GenerateGitChangelogRequest): Promise<ChangelogPreview> => {
  const response = await fetch(`${API_URL}/git-changelogs/admin/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Sync Git commits to database
export const syncGitCommits = async (data: SyncCommitsRequest = {}): Promise<{ syncedCount: number }> => {
  const response = await fetch(`${API_URL}/git-changelogs/admin/sync-commits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Get processed Git commits
export const getGitCommits = async (
  page = 1,
  limit = 50,
  filters: { category?: string; public?: boolean; version?: string } = {}
): Promise<{
  commits: GitCommit[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (filters.category) params.append('category', filters.category);
  if (filters.public !== undefined) params.append('public', filters.public.toString());
  if (filters.version) params.append('version', filters.version);

  const response = await fetch(`${API_URL}/git-changelogs/admin/commits?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });
  return handleApiResponse(response);
};

// Update Git commit properties
export const updateGitCommit = async (hash: string, data: UpdateCommitRequest): Promise<void> => {
  const response = await fetch(`${API_URL}/git-changelogs/admin/commits/${hash}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });
  await handleApiResponse(response);
};

// Get unreleased commits
export const getUnreleasedCommits = async (): Promise<{ commits: any[]; count: number }> => {
  const response = await fetch(`${API_URL}/git-changelogs/admin/commits/unreleased`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });
  return handleApiResponse(response);
};

// Public API functions (no authentication required)

// Get changelog as markdown
export const getChangelogMarkdown = async (
  version?: string,
  options: { metadata?: boolean; commits?: boolean } = {}
): Promise<string> => {
  const params = new URLSearchParams();
  if (options.metadata) params.append('metadata', 'true');
  if (options.commits) params.append('commits', 'true');
  
  const url = version 
    ? `${API_URL}/git-changelogs/markdown/${version}?${params}`
    : `${API_URL}/git-changelogs/markdown?${params}`;
    
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch changelog: ${response.statusText}`);
  }
  return response.text();
};

// Export changelog in various formats
export const exportChangelog = async (
  format: 'json' | 'rss' | 'markdown' | 'md',
  version?: string
): Promise<any> => {
  const params = new URLSearchParams();
  if (version) params.append('version', version);
  
  const response = await fetch(`${API_URL}/git-changelogs/export/${format}?${params}`);
  if (!response.ok) {
    throw new Error(`Failed to export changelog: ${response.statusText}`);
  }
  
  if (format === 'json') {
    return response.json();
  } else {
    return response.text();
  }
};

// Utility functions

// Get category display information
export const getCategoryInfo = (category: string): { emoji: string; title: string; order: number } => {
  const categoryInfo: Record<string, { emoji: string; title: string; order: number }> = {
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
};

// Format commit hash for display
export const formatCommitHash = (hash: string, short = true): string => {
  return short ? hash.substring(0, 7) : hash;
};

// Format date for display
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

// Format commit message for display
export const formatCommitMessage = (message: string, maxLength = 100): string => {
  const firstLine = message.split('\n')[0];
  if (firstLine.length <= maxLength) {
    return firstLine;
  }
  return firstLine.substring(0, maxLength - 3) + '...';
};
