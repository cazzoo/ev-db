/**
 * EV Database API Client
 *
 * This module provides a comprehensive TypeScript client for the EV Database API.
 * It includes all endpoints, proper error handling, and type-safe interfaces.
 *
 * Authentication:
 * - Frontend requests use JWT tokens + frontend secret
 * - External requests use API keys
 *
 * @version 1.0.0
 */

const API_URL = '/api';

// Frontend secret header to identify legitimate frontend requests
const FRONTEND_SECRET = import.meta.env.VITE_FRONTEND_SECRET || 'frontend-secret-key-change-in-production-12345';

/**
 * Get authentication headers for API requests
 * Includes JWT token (if available) and frontend secret
 */
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'X-Frontend-Secret': FRONTEND_SECRET, // This identifies the request as coming from the legitimate frontend
  };
};

/**
 * Standard API error class with additional context
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Handle API response and throw appropriate errors
 */
const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let errorData: any = {};

    try {
      if (contentType?.includes('application/json')) {
        errorData = await response.json();
      } else {
        errorData = { error: await response.text() };
      }
    } catch {
      errorData = { error: 'Unknown error occurred' };
    }

    throw new ApiError(
      errorData.error || errorData.message || `HTTP ${response.status}`,
      response.status,
      errorData.code,
      errorData
    );
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  return response.text() as any;
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User role enumeration
 */
export type UserRole = 'MEMBER' | 'MODERATOR' | 'ADMIN';

/**
 * Contribution status enumeration
 */
export type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/**
 * Contribution change type enumeration
 */
export type ChangeType = 'NEW' | 'UPDATE';

/**
 * User interface
 */
export interface User {
  id: number;
  email: string;
  role: UserRole;
  appCurrencyBalance: number;
  avatarUrl?: string | null;
  theme: string;
  createdAt?: string;
  lastLoginAt?: string | null;
}

/**
 * Public user interface (excludes sensitive information)
 */
export interface UserPublic {
  id: number;
  email: string;
  role: UserRole;
  appCurrencyBalance: number;
  avatarUrl?: string | null;
  theme: string;
}

/**
 * Vehicle image interface
 */
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

/**
 * Vehicle interface
 */
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

/**
 * Vehicle input interface for creating/updating vehicles
 */
export interface VehicleInput {
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
}

/**
 * Detailed vehicle interface with additional metadata
 */
export interface VehicleDetailed extends Vehicle {
  images: VehicleImage[];
  contributionsCount?: number;
}

/**
 * Pagination interface
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Vehicle suggestions interface
 */
export interface VehicleSuggestions {
  makes: string[];
  models: string[];
  modelsByMake: Record<string, string[]>;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Fetch all users (requires authentication)
 * @returns Promise<User[]> List of users
 */
export const fetchUsers = async (): Promise<User[]> => {
  const response = await fetch(`${API_URL}/users`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<User[]>(response);
};

/**
 * Register a new user account
 * @param email User email address
 * @param password User password
 * @returns Promise<{message: string, user: UserPublic}> Registration result
 */
export const registerUser = async (email: string, password: string): Promise<{message: string, user: UserPublic}> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return handleApiResponse<{message: string, user: UserPublic}>(response);
};

/**
 * Login user and receive JWT token
 * @param email User email address
 * @param password User password
 * @returns Promise<{token: string, user: UserPublic}> Login result with token
 */
export const loginUser = async (email: string, password: string): Promise<{token: string, user: UserPublic}> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return handleApiResponse<{token: string, user: UserPublic}>(response);
};

/**
 * Get current authenticated user information
 * @returns Promise<UserPublic> Current user data
 */
export const getCurrentUser = async (): Promise<UserPublic> => {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<UserPublic>(response);
};

// ============================================================================
// VEHICLE MANAGEMENT
// ============================================================================

/**
 * Fetch vehicle suggestions for autocomplete
 * @returns Promise<VehicleSuggestions> Vehicle makes and models
 */
export const fetchVehicleSuggestions = async (): Promise<VehicleSuggestions> => {
  const response = await fetch(`${API_URL}/vehicles/suggestions`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<VehicleSuggestions>(response);
};

/**
 * Fetch models for a specific make
 * @param make Vehicle make
 * @returns Promise<string[]> List of models for the make
 */
export const fetchModelsForMake = async (make: string): Promise<string[]> => {
  const response = await fetch(`${API_URL}/vehicles/suggestions/models/${encodeURIComponent(make)}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await handleApiResponse<{models: string[]}>(response);
  return data.models;
};

/**
 * Fetch all vehicles
 * @returns Promise<Vehicle[]> List of vehicles
 */
export const fetchVehicles = async (): Promise<Vehicle[]> => {
  const response = await fetch(`${API_URL}/vehicles`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<Vehicle[]>(response);
};

/**
 * Fetch vehicles with pagination and filtering
 * @param params Query parameters for filtering and pagination
 * @returns Promise<PaginatedResponse<Vehicle>> Paginated vehicle list
 */
export const fetchVehiclesPaginated = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  make?: string;
  year?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<PaginatedResponse<Vehicle>> => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
  }

  const response = await fetch(`${API_URL}/vehicles?${searchParams}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<PaginatedResponse<Vehicle>>(response);
};

/**
 * Fetch a single vehicle by ID
 * @param id Vehicle ID
 * @returns Promise<VehicleDetailed> Vehicle details with images
 */
export const fetchVehicleById = async (id: number): Promise<VehicleDetailed> => {
  const response = await fetch(`${API_URL}/vehicles/${id}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<VehicleDetailed>(response);
};

/**
 * Create a new vehicle (admin only)
 * @param vehicle Vehicle data
 * @returns Promise<Vehicle> Created vehicle
 */
export const createVehicle = async (vehicle: VehicleInput): Promise<Vehicle> => {
  const response = await fetch(`${API_URL}/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(vehicle),
  });
  const data = await handleApiResponse<{vehicle: Vehicle}>(response);
  return data.vehicle;
};

/**
 * Update an existing vehicle (admin only)
 * @param id Vehicle ID
 * @param vehicle Updated vehicle data
 * @returns Promise<Vehicle> Updated vehicle
 */
export const updateVehicle = async (id: number, vehicle: VehicleInput): Promise<Vehicle> => {
  const response = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(vehicle),
  });
  const data = await handleApiResponse<{vehicle: Vehicle}>(response);
  return data.vehicle;
};

/**
 * Delete a vehicle (admin only)
 * @param id Vehicle ID
 * @returns Promise<void>
 */
export const deleteVehicle = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/vehicles/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  await handleApiResponse<{message: string}>(response);
};

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Statistics interface
 */
export interface Stats {
  usersCount: number;
  vehiclesCount: number;
  contributionsTotal: number;
  contributionsPending: number;
  contributionsApproved: number;
  contributionsRejected: number;
  contributorsCount: number;
}

/**
 * Fetch API statistics
 * @returns Promise<Stats> Database statistics
 */
export const fetchStats = async (): Promise<Stats> => {
  const response = await fetch(`${API_URL}/stats`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<Stats>(response);
};

// ============================================================================
// CONTRIBUTIONS
// ============================================================================

/**
 * Contribution interface
 */
export interface Contribution {
  id: number;
  userId: number;
  userEmail?: string;
  changeType?: ChangeType;
  targetVehicleId?: number;
  vehicleData: Vehicle;
  status: ContributionStatus;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectedBy?: number;
  rejectionComment?: string;
  cancelledAt?: string;
  votes?: number;
}

/**
 * Detailed contribution interface with user information
 */
export interface ContributionDetailed extends Omit<Contribution, 'votes'> {
  user: UserPublic;
  votes: ContributionVote[];
  voteCount: number;
}

/**
 * Contribution vote interface
 */
export interface ContributionVote {
  id: number;
  userId: number;
  vote: number;
}

/**
 * Contribution input interface
 */
export interface ContributionInput {
  vehicleData: VehicleInput;
  changeType: ChangeType;
  targetVehicleId?: number;
}

/**
 * Duplicate error interface
 */
export interface DuplicateError {
  error: string;
  message: string;
  existingVehicle?: Vehicle;
  suggestions?: string[];
}

/**
 * Duplicate check result interface
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingVehicle?: Vehicle;
  suggestions?: string[];
  message?: string;
}

/**
 * Real-time duplicate check for form validation
 * @param vehicleData Partial vehicle data to check
 * @returns Promise<DuplicateCheckResult> Duplicate check result
 */
export const checkForDuplicate = async (vehicleData: Partial<VehicleInput>): Promise<DuplicateCheckResult> => {
  const response = await fetch(`${API_URL}/contributions/check-duplicate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(vehicleData),
  });
  return handleApiResponse<DuplicateCheckResult>(response);
};

/**
 * Submit a new contribution
 * @param vehicleData Vehicle data to contribute
 * @param changeType Type of change (NEW or UPDATE)
 * @param targetVehicleId Target vehicle ID for updates
 * @returns Promise<Contribution> Submitted contribution
 */
export const submitContribution = async (
  vehicleData: VehicleInput,
  changeType?: ChangeType,
  targetVehicleId?: number
): Promise<Contribution> => {
  const response = await fetch(`${API_URL}/contributions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ vehicleData, changeType, targetVehicleId }),
  });

  try {
    const data = await handleApiResponse<{contribution: Contribution}>(response);
    return data.contribution;
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      // Duplicate error - create a special error with additional data
      const duplicateError = new Error(error.details?.message || 'Duplicate vehicle detected') as Error & DuplicateError;
      duplicateError.error = error.details?.error || 'DUPLICATE_VEHICLE';
      duplicateError.message = error.details?.message || 'Duplicate vehicle detected';
      duplicateError.existingVehicle = error.details?.existingVehicle;
      duplicateError.suggestions = error.details?.suggestions;
      throw duplicateError;
    }
    throw error;
  }
};

/**
 * Fetch pending contributions
 * @returns Promise<Contribution[]> List of pending contributions
 */
export const fetchPendingContributions = async (): Promise<Contribution[]> => {
  const response = await fetch(`${API_URL}/contributions/pending`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<Contribution[]>(response);
};

/**
 * Fetch all contributions with pagination
 * @param params Query parameters for filtering and pagination
 * @returns Promise<PaginatedResponse<Contribution>> Paginated contribution list
 */
export const fetchAllContributions = async (params?: {
  page?: number;
  limit?: number;
  status?: ContributionStatus;
  userId?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<PaginatedResponse<Contribution>> => {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
  }

  const response = await fetch(`${API_URL}/contributions?${searchParams}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<PaginatedResponse<Contribution>>(response);
};

/**
 * Fetch current user's contributions
 * @returns Promise<Contribution[]> List of user's contributions
 */
export const fetchMyContributions = async (): Promise<Contribution[]> => {
  const response = await fetch(`${API_URL}/contributions/my`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<Contribution[]>(response);
};

/**
 * Get a specific contribution by ID
 * @param id Contribution ID
 * @returns Promise<ContributionDetailed> Detailed contribution information
 */
export const fetchContributionById = async (id: number): Promise<ContributionDetailed> => {
  const response = await fetch(`${API_URL}/contributions/${id}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<ContributionDetailed>(response);
};

/**
 * Vote on a contribution
 * @param id Contribution ID
 * @returns Promise<void>
 */
export const voteOnContribution = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/contributions/${id}/vote`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });
  await handleApiResponse<{message: string}>(response);
};

/**
 * Approve a contribution (moderator/admin only)
 * @param id Contribution ID
 * @returns Promise<{message: string, contribution: Contribution, vehicle?: Vehicle}>
 */
export const approveContribution = async (id: number): Promise<{message: string, contribution: Contribution, vehicle?: Vehicle}> => {
  const response = await fetch(`${API_URL}/contributions/${id}/approve`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<{message: string, contribution: Contribution, vehicle?: Vehicle}>(response);
};

/**
 * Reject a contribution (moderator/admin only)
 * @param id Contribution ID
 * @param comment Rejection reason
 * @returns Promise<{message: string, contribution: Contribution}>
 */
export const rejectContribution = async (id: number, comment: string): Promise<{message: string, contribution: Contribution}> => {
  const response = await fetch(`${API_URL}/contributions/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ comment }),
  });
  return handleApiResponse<{message: string, contribution: Contribution}>(response);
};

/**
 * Cancel user's own contribution
 * @param id Contribution ID
 * @returns Promise<void>
 */
export const cancelMyContribution = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/contributions/${id}/cancel`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });
  await handleApiResponse<{message: string}>(response);
};

/**
 * Resubmit a cancelled contribution
 * @param id Contribution ID
 * @returns Promise<Contribution> Resubmitted contribution
 */
export const resubmitContribution = async (id: number): Promise<Contribution> => {
  const response = await fetch(`${API_URL}/contributions/${id}/resubmit`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });
  const data = await handleApiResponse<{contribution: Contribution}>(response);
  return data.contribution;
};

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * API key interface
 */
export interface ApiKey {
  id: number;
  key?: string; // Only present when creating
  userId: number;
  name?: string;
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
}

/**
 * Daily usage interface
 */
export interface DailyUsage {
  day: string;
  count: number;
}

/**
 * Daily usage per key interface
 */
export interface DailyUsagePerKey {
  day: string;
  apiKeyId: number;
  apiKeyName: string | null;
  count: number;
}

/**
 * Rate limit status interface
 */
export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetTime: string;
  userRole: UserRole;
}

/**
 * Moderation log interface
 */
export interface ModerationLog {
  id: number;
  action: 'REJECT';
  moderatorId: number;
  moderatorEmail?: string;
  comment?: string;
  createdAt: string;
}

/**
 * Fetch moderation logs for a contribution
 * @param contributionId Contribution ID
 * @returns Promise<ModerationLog[]> List of moderation logs
 */
export const fetchModerationLogs = async (contributionId: number): Promise<ModerationLog[]> => {
  const response = await fetch(`${API_URL}/contributions/${contributionId}/moderation-logs`, {
    headers: { ...getAuthHeaders() },
  });
  const data = await handleApiResponse<{logs: ModerationLog[]}>(response);
  return data.logs || [];
};

/**
 * Update user's own contribution (if still pending)
 * @param id Contribution ID
 * @param vehicleData Updated vehicle data
 * @param changeType Type of change
 * @param targetVehicleId Target vehicle ID for updates
 * @returns Promise<void>
 */
export const updateMyContribution = async (
  id: number,
  vehicleData: VehicleInput,
  changeType?: ChangeType,
  targetVehicleId?: number
): Promise<void> => {
  const response = await fetch(`${API_URL}/contributions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ vehicleData, changeType, targetVehicleId }),
  });
  await handleApiResponse<{message: string}>(response);
};

/**
 * Fetch all API keys for the current user
 * @returns Promise<ApiKey[]> List of user's API keys
 */
export const fetchApiKeys = async (): Promise<ApiKey[]> => {
  const response = await fetch(`${API_URL}/apikeys`, {
    headers: { ...getAuthHeaders() }
  });
  const data = await handleApiResponse<{apiKeys: ApiKey[]}>(response);
  return data.apiKeys;
};

/**
 * Create a new API key
 * @param name Optional name for the API key
 * @param expiresAt Optional expiration date
 * @returns Promise<{apiKey: string, id: number}> Created API key with secret
 */
export const createApiKey = async (name?: string, expiresAt?: string): Promise<{ apiKey: string; id: number }> => {
  const response = await fetch(`${API_URL}/apikeys`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ name, expiresAt })
  });
  return handleApiResponse<{ apiKey: string; id: number }>(response);
};

/**
 * Revoke an API key
 * @param id API key ID
 * @returns Promise<void>
 */
export const revokeApiKey = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/apikeys/${id}/revoke`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() }
  });
  await handleApiResponse<{message: string}>(response);
};

/**
 * Fetch daily API usage statistics
 * @returns Promise<DailyUsage[]> Daily usage data
 */
export const fetchApiUsage = async (): Promise<DailyUsage[]> => {
  const response = await fetch(`${API_URL}/apikeys/usage/daily`, {
    headers: { ...getAuthHeaders() }
  });
  const data = await handleApiResponse<{usage: DailyUsage[]}>(response);
  return data.usage;
};

/**
 * Fetch detailed API usage statistics per key
 * @returns Promise<DailyUsagePerKey[]> Per-key usage data
 */
export const fetchApiUsageStats = async (): Promise<DailyUsagePerKey[]> => {
  const response = await fetch(`${API_URL}/apikeys/usage/stats`, {
    headers: { ...getAuthHeaders() }
  });
  return handleApiResponse<DailyUsagePerKey[]>(response);
};

/**
 * Get current rate limit status
 * @returns Promise<RateLimitStatus> Rate limit information
 */
export const fetchRateLimitStatus = async (): Promise<RateLimitStatus> => {
  const response = await fetch(`${API_URL}/apikeys/rate-limit-status`, {
    headers: { ...getAuthHeaders() }
  });
  return handleApiResponse<RateLimitStatus>(response);
};

// ============================================================================
// USER PREFERENCES & AVATAR
// ============================================================================

/**
 * User preferences interface
 */
export interface UserPreferences {
  theme?: string;
}

/**
 * Upload user avatar
 * @param file Avatar image file
 * @returns Promise<{avatarUrl: string}> Avatar upload result
 */
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
  return handleApiResponse<{ avatarUrl: string }>(response);
};

/**
 * Delete user avatar
 * @returns Promise<void>
 */
export const deleteAvatar = async (): Promise<void> => {
  const response = await fetch(`${API_URL}/auth/avatar`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  await handleApiResponse<{message: string}>(response);
};

/**
 * Update user preferences
 * @param preferences User preferences to update
 * @returns Promise<UserPreferences> Updated preferences
 */
export const updateUserPreferences = async (preferences: UserPreferences): Promise<UserPreferences> => {
  const response = await fetch(`${API_URL}/auth/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(preferences),
  });
  return handleApiResponse<UserPreferences>(response);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get full avatar URL from relative path
 * @param avatarPath Relative avatar path
 * @returns Full avatar URL or null
 */
export const getAvatarUrl = (avatarPath: string | null): string | null => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;
  // avatarPath should be relative like "auth/avatar/filename.svg"
  return `${API_URL}/${avatarPath}`;
};

/**
 * Get full upload URL from relative path
 * @param uploadPath Relative upload path
 * @returns Full upload URL or null
 */
export const getUploadUrl = (uploadPath: string | null): string | null => {
  if (!uploadPath) return null;
  if (uploadPath.startsWith('http')) return uploadPath;
  // uploadPath should be relative like "temp/filename.jpg" or "images/filename.jpg"
  return `/uploads/${uploadPath}`;
};

// ============================================================================
// DEVELOPMENT & SEEDING
// ============================================================================

/**
 * Seed vehicles (development only)
 * @returns Promise<void>
 */
export const seedVehicles = async (): Promise<void> => {
  const response = await fetch(`${API_URL}/seed/vehicles`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });
  await handleApiResponse<{message: string}>(response);
};

/**
 * Seed contributions (development only)
 * @param count Number of contributions to create
 * @returns Promise<void>
 */
export const seedContributions = async (count: number = 10): Promise<void> => {
  const response = await fetch(`${API_URL}/seed/contributions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ count })
  });
  await handleApiResponse<{message: string}>(response);
};

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

/**
 * Admin statistics interface
 */
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

/**
 * Admin user interface
 */
export interface AdminUser {
  id: number;
  email: string;
  role: UserRole;
  appCurrencyBalance: number;
  avatarUrl?: string | null;
  createdAt?: string;
  lastLoginAt?: string | null;
}

/**
 * Admin users response interface
 */
export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: Pagination;
}

/**
 * Fetch admin statistics (admin only)
 * @returns Promise<AdminStats> Admin statistics
 */
export const fetchAdminStats = async (): Promise<AdminStats> => {
  const response = await fetch(`${API_URL}/admin/stats`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<AdminStats>(response);
};

/**
 * Fetch users with admin capabilities (admin only)
 * @param page Page number
 * @param limit Items per page
 * @param search Search term
 * @param role Filter by role
 * @param sortBy Sort field
 * @param sortOrder Sort direction
 * @returns Promise<AdminUsersResponse> Paginated user list
 */
export const fetchAdminUsers = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: UserRole,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
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
  return handleApiResponse<AdminUsersResponse>(response);
};

/**
 * Fetch a specific user by ID (admin only)
 * @param id User ID
 * @returns Promise<AdminUser> User details
 */
export const fetchAdminUser = async (id: number): Promise<AdminUser> => {
  const response = await fetch(`${API_URL}/admin/users/${id}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleApiResponse<AdminUser>(response);
};

/**
 * Update user information (admin only)
 * @param id User ID
 * @param updates User updates
 * @returns Promise<AdminUser> Updated user
 */
export const updateAdminUser = async (
  id: number,
  updates: {
    email?: string;
    role?: UserRole;
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
  const data = await handleApiResponse<{user: AdminUser}>(response);
  return data.user;
};

/**
 * Delete a user (admin only)
 * @param id User ID
 * @returns Promise<void>
 */
export const deleteAdminUser = async (id: number): Promise<void> => {
  const response = await fetch(`${API_URL}/admin/users/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  await handleApiResponse<{message: string}>(response);
};

// ============================================================================
// EXPORTS SUMMARY
// ============================================================================

/**
 * EV Database API Client - Complete TypeScript interface
 *
 * This module provides:
 * - Type-safe API client with comprehensive error handling
 * - All endpoints documented with JSDoc comments
 * - Consistent response handling and error management
 * - Support for both JWT (frontend) and API key authentication
 * - Pagination, filtering, and sorting capabilities
 * - File upload support for avatars and images
 * - Admin functions for user and system management
 *
 * Usage:
 * ```typescript
 * import { fetchVehicles, createApiKey, ApiError } from './api';
 *
 * try {
 *   const vehicles = await fetchVehicles();
 *   console.log('Vehicles:', vehicles);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error('API Error:', error.message, error.status);
 *   }
 * }
 * ```
 */

// Note: The remaining functions in this file maintain backward compatibility
// but should be gradually updated to use the new handleApiResponse pattern
// for consistent error handling across the application.

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

// ===== ADMIN SETTINGS API =====

export interface AdminSetting {
  id: number;
  category: string;
  key: string;
  value: string | null;
  dataType: string;
  description: string | null;
  isEncrypted: boolean;
  validationRules: string | null;
  defaultValue: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
}

export interface AdminSettingAudit {
  id: number;
  oldValue: string | null;
  newValue: string | null;
  action: string;
  changedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  changedByEmail: string | null;
}

export interface SettingsExport {
  exportedAt: string;
  version: string;
  settings: Array<{
    category: string;
    key: string;
    value: string | null;
    dataType: string;
    description: string | null;
    validationRules: string | null;
    defaultValue: string | null;
  }>;
}

// Get all settings or by category
export const fetchAdminSettings = async (category?: string): Promise<{ settings: AdminSetting[] }> => {
  const url = category
    ? `${API_URL}/admin/settings?category=${encodeURIComponent(category)}`
    : `${API_URL}/admin/settings`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch settings');
  }
  return response.json();
};

// Get specific setting by category and key
export const fetchAdminSetting = async (category: string, key: string): Promise<{ setting: AdminSetting }> => {
  const response = await fetch(`${API_URL}/admin/settings/${encodeURIComponent(category)}/${encodeURIComponent(key)}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch setting');
  }
  return response.json();
};

// Update setting value
export const updateAdminSetting = async (settingId: number, value: any): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/admin/settings/${settingId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ value }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to update setting');
  }
  return response.json();
};

// Bulk update settings
export const bulkUpdateAdminSettings = async (
  updates: Array<{ id: number; value: any }>
): Promise<{
  message: string;
  results: Array<{ id: number; success: boolean }>;
  errors?: Array<{ id: number; error: string }>
}> => {
  const response = await fetch(`${API_URL}/admin/settings/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ updates }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to bulk update settings');
  }
  return response.json();
};

// Get audit trail for a setting
export const fetchSettingAuditTrail = async (
  settingId: number,
  limit = 50
): Promise<{ auditTrail: AdminSettingAudit[] }> => {
  const response = await fetch(`${API_URL}/admin/settings/${settingId}/audit?limit=${limit}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch audit trail');
  }
  return response.json();
};

// Export settings for backup
export const exportAdminSettings = async (): Promise<SettingsExport> => {
  const response = await fetch(`${API_URL}/admin/settings/export`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to export settings');
  }
  return response.json();
};

// Import settings from backup
export const importAdminSettings = async (
  settings: SettingsExport['settings'],
  overwrite = false
): Promise<{
  message: string;
  results: Array<{ setting: string; status: string; reason?: string }>;
  errors?: Array<{ setting: string; error: string }>
}> => {
  const response = await fetch(`${API_URL}/admin/settings/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ settings, overwrite }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to import settings');
  }
  return response.json();
};

// Seed default settings
export const seedDefaultAdminSettings = async (): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/admin/settings/seed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to seed default settings');
  }
  return response.json();
};

// Check maintenance mode status (public endpoint)
export const checkMaintenanceMode = async (): Promise<{ isMaintenanceMode: boolean; message?: string }> => {
  try {
    const response = await fetch(`${API_URL}/maintenance-status`, {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // If we can't check maintenance mode, assume it's off to prevent lockout
    console.warn('Failed to check maintenance mode:', error);
    return { isMaintenanceMode: false, message: 'System is operational' };
  }
};

// ===== IN-APP NOTIFICATIONS API =====

export interface InAppNotification {
  id: number;
  userId: number;
  title: string;
  content: string;
  eventType: string;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface NotificationsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Get user's in-app notifications
export const fetchInAppNotifications = async (
  page = 1,
  limit = 20,
  unreadOnly = false
): Promise<{
  notifications: InAppNotification[];
  pagination: NotificationsPagination
}> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(unreadOnly && { unread_only: 'true' })
  });

  const response = await fetch(`${API_URL}/user/notifications?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch notifications');
  }
  return response.json();
};

// Get unread notification count
export const fetchUnreadNotificationCount = async (): Promise<{ unreadCount: number }> => {
  const response = await fetch(`${API_URL}/user/notifications/unread-count`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch unread count');
  }
  return response.json();
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: number): Promise<{
  message: string;
  notification: InAppNotification
}> => {
  const response = await fetch(`${API_URL}/user/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to mark notification as read');
  }
  return response.json();
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<{
  message: string;
  updatedCount: number
}> => {
  const response = await fetch(`${API_URL}/user/notifications/mark-all-read`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to mark all notifications as read');
  }
  return response.json();
};

// Delete notification
export const deleteNotification = async (notificationId: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/user/notifications/${notificationId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to delete notification');
  }
  return response.json();
};

// Clear all notifications
export const clearAllNotifications = async (): Promise<{
  message: string;
  deletedCount: number
}> => {
  const response = await fetch(`${API_URL}/user/notifications/clear-all`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to clear all notifications');
  }
  return response.json();
};

// Get notification by ID
export const fetchNotificationById = async (notificationId: number): Promise<{
  notification: InAppNotification
}> => {
  const response = await fetch(`${API_URL}/user/notifications/${notificationId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to fetch notification');
  }
  return response.json();
};
