const API_URL = 'http://localhost:3000/api';

// Frontend secret header to identify legitimate frontend requests
const FRONTEND_SECRET = import.meta.env.VITE_FRONTEND_SECRET || 'frontend-secret-key-change-in-production';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'X-Frontend-Secret': FRONTEND_SECRET, // This identifies the request as coming from the legitimate frontend
  };
};

export const fetchUsers = async () => {
  const response = await fetch(`${API_URL}/users`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  return response.json();
};

export const registerUser = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to register');
  }
  return data;
};

export const loginUser = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to login');
  }
  return data;
};

export const getCurrentUser = async () => {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch user data');
  }
  return data;
};

export interface VehicleImage {
  id: number;
  vehicleId: number;
  filename: string;
  path: string;
  url: string;
  altText?: string;
  caption?: string;
  displayOrder: number;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  uploadedBy?: number;
  uploadedAt: Date;
  isApproved: boolean;
  approvedBy?: number;
  approvedAt?: Date;
}

export interface Vehicle {
  id?: number;
  make: string;
  model: string;
  year: number;
  batteryCapacity?: number;
  range?: number;
  chargingSpeed?: number;
  acceleration?: number;
  topSpeed?: number;
  price?: number;
  description?: string;
  images?: VehicleImage[];
}

export const fetchVehicleSuggestions = async (): Promise<VehicleSuggestions> => {
  const response = await fetch(`${API_URL}/vehicles/suggestions`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch vehicle suggestions');
  }
  return response.json();
};

export const fetchModelsForMake = async (make: string): Promise<string[]> => {
  const response = await fetch(`${API_URL}/vehicles/suggestions/models/${encodeURIComponent(make)}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch models for make');
  }
  const data = await response.json();
  return data.models;
};

export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const response = await fetch(`${API_URL}/vehicles`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch vehicles');
  }
  return response.json();
};

export const createVehicle = async (vehicle: Vehicle): Promise<Vehicle> => {
  const response = await fetch(`${API_URL}/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(vehicle),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create vehicle');
  }
  return data.vehicle;
};

export const updateVehicle = async (id: number, vehicle: Vehicle): Promise<Vehicle> => {
  const response = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(vehicle),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update vehicle');
  }
  return data.vehicle;
};

export const deleteVehicle = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete vehicle');
  }
};

export interface Stats {
  usersCount: number;
  vehiclesCount: number;
  contributionsTotal: number;
  contributionsPending: number;
  contributionsApproved: number;
  contributionsRejected: number;
  contributorsCount: number;
}

export const fetchStats = async (): Promise<Stats> => {
  const response = await fetch(`${API_URL}/stats`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  return response.json();
};

export interface Contribution {
  id: number;
  userId: number;
  userEmail?: string;
  changeType?: 'NEW' | 'UPDATE';
  targetVehicleId?: number;
  vehicleData: Vehicle;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  votes?: number; // Added votes property
}

export interface DuplicateError {
  error: string;
  message: string;
  existingVehicle?: Vehicle;
  suggestions?: string[];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingVehicle?: Vehicle;
  suggestions?: string[];
  message?: string;
}

export interface VehicleSuggestions {
  makes: string[];
  models: string[];
  modelsByMake: Record<string, string[]>;
}

// Real-time duplicate check for form validation
export const checkForDuplicate = async (vehicleData: Partial<Vehicle>): Promise<DuplicateCheckResult> => {
  const response = await fetch(`${API_URL}/contributions/check-duplicate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(vehicleData),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to check for duplicates');
  }
  return data;
};

export const submitContribution = async (vehicleData: Vehicle, changeType?: 'NEW' | 'UPDATE', targetVehicleId?: number): Promise<Contribution> => {
  const response = await fetch(`${API_URL}/contributions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ vehicleData, changeType, targetVehicleId }),
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 409) {
      // Duplicate error - create a special error with additional data
      const duplicateError = new Error(data.message || 'Duplicate vehicle detected') as Error & DuplicateError;
      duplicateError.error = data.error;
      duplicateError.message = data.message;
      duplicateError.existingVehicle = data.existingVehicle;
      duplicateError.suggestions = data.suggestions;
      throw duplicateError;
    }
    throw new Error(data.error || 'Failed to submit contribution');
  }
  return data.contribution;
};

export const fetchPendingContributions = async (): Promise<Contribution[]> => {
  const response = await fetch(`${API_URL}/contributions/pending`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Failed to fetch pending contributions');
  }
  return response.json();
};

export const fetchAllContributions = async (): Promise<Contribution[]> => {
  const response = await fetch(`${API_URL}/contributions/all`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Failed to fetch all contributions');
  }
  return response.json();
};

export const fetchMyContributions = async (): Promise<Contribution[]> => {
  const response = await fetch(`${API_URL}/contributions/my`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch my contributions');
  }
  return data;
};

export const voteOnContribution = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/contributions/${id}/vote`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to vote on contribution');
  }
};

export const approveContribution = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/contributions/${id}/approve`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to approve contribution');
  }
};

export const rejectContribution = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/contributions/${id}/reject`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to reject contribution');
  }
};

export const cancelMyContribution = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/contributions/${id}/cancel`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to cancel contribution');
  }
};

export const updateMyContribution = async (id: number, vehicleData: Vehicle, changeType?: 'NEW' | 'UPDATE', targetVehicleId?: number): Promise<void> => {
  const response = await fetch(`${API_URL}/contributions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ vehicleData, changeType, targetVehicleId }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update contribution');
  }
};

export const seedVehicles = async (): Promise<void> => {
  const response = await fetch(`${API_URL}/seed/vehicles`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to seed vehicles');
  }
};

export const seedContributions = async (count: number = 10): Promise<void> => {
  const response = await fetch(`${API_URL}/seed/contributions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ count })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to seed contributions');
  }
};

// API Keys and Usage
export interface ApiKey {
  id: number;
  key: string;
  userId: number;
  name?: string;
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
}

export const fetchApiKeys = async (): Promise<ApiKey[]> => {
  const response = await fetch(`${API_URL}/apikeys`, { headers: { ...getAuthHeaders() } });
  if (!response.ok) {
    const text = await response.text().catch(() => 'Failed to fetch API keys');
    throw new Error(text);
  }
  return response.json();
};

export const createApiKey = async (name?: string, expiresAt?: string): Promise<{ apiKey: string; id: number }> => {
  const response = await fetch(`${API_URL}/apikeys`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ name, expiresAt }) });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to create API key');
  }
  return data;
};

export const revokeApiKey = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/apikeys/${id}/revoke`, { method: 'POST', headers: { ...getAuthHeaders() } });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to revoke API key');
  }
};

export interface DailyUsage { day: string; count: number }

export interface DailyUsagePerKey {
  day: string;
  apiKeyId: number;
  apiKeyName: string | null;
  count: number
}

export const fetchApiUsage = async (): Promise<DailyUsage[]> => {
  const response = await fetch(`${API_URL}/apikeys/usage`, { headers: { ...getAuthHeaders() } });
  if (!response.ok) {
    const text = await response.text().catch(() => 'Failed to fetch usage');
    throw new Error(text);
  }
  return response.json();
};

export const fetchApiUsageStats = async (): Promise<DailyUsagePerKey[]> => {
  const response = await fetch(`${API_URL}/apikeys/usage/stats`, { headers: { ...getAuthHeaders() } });
  if (!response.ok) {
    const text = await response.text().catch(() => 'Failed to fetch per-key usage');
    throw new Error(text);
  }
  return response.json();
};

// Avatar management
export const uploadAvatar = async (file: File): Promise<{ avatarUrl: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch(`${API_URL}/auth/avatar/upload`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to upload avatar');
  }
  return data;
};

export const deleteAvatar = async (): Promise<void> => {
  const response = await fetch(`${API_URL}/auth/avatar`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete avatar');
  }
};

// Theme preferences
export const updateUserPreferences = async (preferences: { theme?: string }): Promise<{ theme: string }> => {
  const response = await fetch(`${API_URL}/auth/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(preferences),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update preferences');
  }
  return data;
};

export const getAvatarUrl = (avatarPath: string | null): string | null => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;
  // avatarPath should be relative like "auth/avatar/filename.svg"
  return `${API_URL}/${avatarPath}`;
};

// Admin API functions
export interface AdminStats {
  totalUsers: number;
  roleStats: Record<string, number>;
  topBalances: Array<{
    id: number;
    email: string;
    appCurrencyBalance: number;
  }>;
  totalCurrency: number;
}

export interface AdminUser {
  id: number;
  email: string;
  role: string;
  appCurrencyBalance: number;
  avatarUrl?: string | null;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const fetchAdminStats = async (): Promise<AdminStats> => {
  const response = await fetch(`${API_URL}/admin/stats`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch admin stats');
  }
  return response.json();
};

export const fetchAdminUsers = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: string,
  sortBy?: string,
  sortOrder?: string
): Promise<AdminUsersResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) params.append('search', search);
  if (role) params.append('role', role);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  const response = await fetch(`${API_URL}/admin/users?${params}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch admin users');
  }
  return response.json();
};

export const fetchAdminUser = async (id: number): Promise<AdminUser> => {
  const response = await fetch(`${API_URL}/admin/users/${id}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch user');
  }
  return response.json();
};

export const updateAdminUser = async (
  id: number,
  updates: {
    email?: string;
    role?: string;
    appCurrencyBalance?: number;
    password?: string;
  }
): Promise<AdminUser> => {
  const response = await fetch(`${API_URL}/admin/users/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(updates),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update user');
  }
  return data.user;
};

export const deleteAdminUser = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/users/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete user');
  }
};

export const bulkAdminUserAction = async (
  action: 'delete' | 'updateRole' | 'updateBalance',
  userIds: number[],
  options?: {
    role?: string;
    balance?: number;
  }
): Promise<{ affectedUsers: number; users: AdminUser[] }> => {
  const response = await fetch(`${API_URL}/admin/users/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      action,
      userIds,
      ...options,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to perform bulk action');
  }
  return data;
};

// Delete user avatar (Admin only)
export const deleteUserAvatar = async (userId: number): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/avatar`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete user avatar');
  }
};

// Development-only admin functions
export const wipeAllVehicles = async (): Promise<{ message: string; deletedCount: number }> => {
  const response = await fetch(`${API_URL}/admin/dev/wipe-vehicles`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to wipe vehicles');
  }
  return response.json();
};

export const wipeAllContributions = async (): Promise<{ message: string; deletedCount: number; deletedReviewsCount?: number }> => {
  const response = await fetch(`${API_URL}/admin/dev/wipe-contributions`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to wipe contributions');
  }
  return response.json();
};

export const cleanupOrphanedContributions = async (): Promise<{ message: string; cleanedCount: number; orphanedContributions: Array<{ contributionId: number; missingVehicleId: number }> }> => {
  const response = await fetch(`${API_URL}/admin/cleanup-orphaned-contributions`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to cleanup orphaned contributions');
  }
  return response.json();
};

// Image-related API functions

export const fetchVehicleImages = async (vehicleId: number): Promise<VehicleImage[]> => {
  const response = await fetch(`${API_URL}/images/vehicle/${vehicleId}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch vehicle images');
  }
  return response.json();
};

export const submitImageContribution = async (
  vehicleId: number,
  imageFile: File,
  contributionId?: number,
  altText?: string,
  caption?: string
): Promise<{ message: string; contributionId: number }> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('vehicleId', vehicleId.toString());
  if (contributionId) formData.append('contributionId', contributionId.toString());
  if (altText) formData.append('altText', altText);
  if (caption) formData.append('caption', caption);

  const response = await fetch(`${API_URL}/images/contribute`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to submit image');
  }
  return response.json();
};

export interface ImageContribution {
  id: number;
  userId: number;
  vehicleId: number;
  contributionId?: number;
  filename: string;
  originalFilename: string;
  path: string;
  altText?: string;
  caption?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  submittedAt: Date;
  reviewedBy?: number;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export const fetchPendingImageContributions = async (): Promise<ImageContribution[]> => {
  const response = await fetch(`${API_URL}/images/contributions/pending`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch pending image contributions');
  }
  return response.json();
};

export const approveImageContribution = async (
  contributionId: number,
  displayOrder?: number
): Promise<{ message: string; image: VehicleImage }> => {
  const response = await fetch(`${API_URL}/images/contributions/${contributionId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ displayOrder }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to approve image');
  }
  return response.json();
};

export const rejectImageContribution = async (
  contributionId: number,
  reason?: string
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/images/contributions/${contributionId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to reject image');
  }
  return response.json();
};

export const deleteVehicleImage = async (imageId: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/images/${imageId}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete image');
  }
  return response.json();
};

export const updateImageOrder = async (
  vehicleId: number,
  imageOrders: { id: number; order: number }[]
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/images/vehicle/${vehicleId}/order`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ imageOrders }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to update image order');
  }
  return response.json();
};
