// Get auth token from localStorage
const getAuthToken = (): string => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Types for changelog management
export interface CreateChangelogRequest {
  version: string;
  title: string;
  description?: string;
  releaseDate: string;
  entries: CreateChangelogEntryRequest[];
  isPublished?: boolean;
  sendNotification?: boolean;
}

export interface CreateChangelogEntryRequest {
  category: 'feature' | 'bugfix' | 'improvement' | 'breaking' | 'security' | 'deprecated';
  title: string;
  description: string;
  sortOrder?: number;
}

export interface UpdateChangelogRequest {
  title?: string;
  description?: string;
  releaseDate?: string;
  isPublished?: boolean;
}

export interface ChangelogEntry {
  id: number;
  category: 'feature' | 'bugfix' | 'improvement' | 'breaking' | 'security' | 'deprecated';
  title: string;
  description: string;
  sortOrder: number;
}

export interface Changelog {
  id: number;
  version: string;
  title: string;
  description?: string;
  releaseDate: string;
  isPublished: boolean;
  publishedAt?: string;
  notificationSent: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  entries: ChangelogEntry[];
  author?: {
    id: number;
    email: string;
    name?: string;
  };
}

// Helper function to handle API responses
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// Public API (no authentication required)

// Get all published changelogs
export const getPublicChangelogs = async (page = 1, limit = 20): Promise<{
  changelogs: Changelog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const response = await fetch(`${API_URL}/changelogs/public?page=${page}&limit=${limit}`, {
    method: 'GET',
  });
  return handleApiResponse(response);
};

// Get specific published changelog by version
export const getPublicChangelogByVersion = async (version: string): Promise<Changelog> => {
  const response = await fetch(`${API_URL}/changelogs/public/${version}`, {
    method: 'GET',
  });
  return handleApiResponse(response);
};

// Get latest published changelog
export const getLatestChangelog = async (): Promise<Changelog> => {
  const response = await fetch(`${API_URL}/changelogs/public/latest`, {
    method: 'GET',
  });
  return handleApiResponse(response);
};

// Admin API (requires admin authentication)

// Create new changelog
export const createChangelog = async (data: CreateChangelogRequest): Promise<{ message: string; changelogId: number }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/changelogs/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Get all changelogs (including unpublished)
export const getAllChangelogs = async (page = 1, limit = 20): Promise<{
  changelogs: Changelog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/changelogs/admin?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleApiResponse(response);
};

// Get specific changelog by ID
export const getChangelogById = async (id: number): Promise<Changelog> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/changelogs/admin/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleApiResponse(response);
};

// Update changelog
export const updateChangelog = async (id: number, data: UpdateChangelogRequest): Promise<{ message: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/changelogs/admin/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Delete changelog
export const deleteChangelog = async (id: number): Promise<{ message: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/changelogs/admin/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleApiResponse(response);
};

// Add entry to changelog
export const addChangelogEntry = async (id: number, data: CreateChangelogEntryRequest): Promise<{ message: string; entryId: number }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/changelogs/admin/${id}/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Update changelog entry
export const updateChangelogEntry = async (entryId: number, data: Partial<CreateChangelogEntryRequest>): Promise<{ message: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/changelogs/admin/entries/${entryId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  return handleApiResponse(response);
};

// Delete changelog entry
export const deleteChangelogEntry = async (entryId: number): Promise<{ message: string }> => {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/changelogs/admin/entries/${entryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return handleApiResponse(response);
};

// Available entry categories
export const ENTRY_CATEGORIES = [
  { value: 'feature', label: '✨ Feature', color: 'text-success', bgColor: 'bg-success/10' },
  { value: 'improvement', label: '⚡ Improvement', color: 'text-info', bgColor: 'bg-info/10' },
  { value: 'bugfix', label: '🐛 Bug Fix', color: 'text-warning', bgColor: 'bg-warning/10' },
  { value: 'security', label: '🔒 Security', color: 'text-error', bgColor: 'bg-error/10' },
  { value: 'breaking', label: '💥 Breaking Change', color: 'text-error', bgColor: 'bg-error/10' },
  { value: 'deprecated', label: '⚠️ Deprecated', color: 'text-warning', bgColor: 'bg-warning/10' },
];

// Helper functions
export const getCategoryInfo = (category: string) => {
  return ENTRY_CATEGORIES.find(cat => cat.value === category) || ENTRY_CATEGORIES[0];
};

export const formatReleaseDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const sortEntriesByCategory = (entries: ChangelogEntry[]): ChangelogEntry[] => {
  const categoryOrder = ['breaking', 'feature', 'improvement', 'security', 'bugfix', 'deprecated'];

  return [...entries].sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.category);
    const bIndex = categoryOrder.indexOf(b.category);

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return a.sortOrder - b.sortOrder;
  });
};
