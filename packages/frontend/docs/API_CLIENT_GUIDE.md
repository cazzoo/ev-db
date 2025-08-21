# Frontend API Client Guide

## Overview

The EV Database frontend includes a comprehensive TypeScript API client that provides type-safe access to all backend endpoints. This guide covers the updated API client structure, usage patterns, and best practices.

## Key Features

### 🎯 **Type Safety**
- Complete TypeScript interfaces for all API requests and responses
- Compile-time error checking for API calls
- IntelliSense support in IDEs

### ⚡ **Improved Error Handling**
- Standardized `ApiError` class with detailed error information
- Consistent error handling patterns across all endpoints
- HTTP status code and error message extraction

### 📚 **Comprehensive Documentation**
- JSDoc comments for all functions
- Parameter and return type documentation
- Usage examples and error handling patterns

### 🔄 **Consistent Patterns**
- Unified authentication handling
- Standardized response processing
- Consistent naming conventions

## Quick Start

### Basic Import and Usage

```typescript
import { 
  fetchVehicles, 
  createApiKey, 
  ApiError,
  Vehicle,
  ApiKey 
} from '../services/api';

// Fetch vehicles with full type safety
try {
  const vehicles: Vehicle[] = await fetchVehicles();
  console.log('Found vehicles:', vehicles.length);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message, 'Status:', error.status);
  }
}
```

### Error Handling

```typescript
import { ApiError, fetchVehicleById } from '../services/api';

try {
  const vehicle = await fetchVehicleById(123);
  console.log('Vehicle:', vehicle);
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        // Redirect to login
        break;
      case 403:
        // Show permission error
        break;
      case 404:
        // Show not found message
        break;
      case 429:
        // Handle rate limiting
        break;
      default:
        // Generic error handling
        console.error('API Error:', error.message);
    }
  }
}
```

## Core Interfaces

### Vehicle Management
```typescript
interface Vehicle {
  id?: number;
  make: string;
  model: string;
  year: number;
  batteryCapacity?: number;
  range?: number;
  chargingSpeed?: number;
  description?: string;
  images?: VehicleImage[];
}

interface VehicleDetailed extends Vehicle {
  images: VehicleImage[];
  contributionsCount?: number;
}
```

### User Management
```typescript
interface User {
  id: number;
  email: string;
  role: UserRole;
  appCurrencyBalance: number;
  avatarUrl?: string | null;
  theme: string;
}

type UserRole = 'MEMBER' | 'MODERATOR' | 'ADMIN';
```

### Contributions
```typescript
interface Contribution {
  id: number;
  userId: number;
  vehicleData: Vehicle;
  status: ContributionStatus;
  changeType?: ChangeType;
  createdAt: string;
  votes?: number;
}

type ContributionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type ChangeType = 'NEW' | 'UPDATE';
```

### API Keys
```typescript
interface ApiKey {
  id: number;
  key?: string; // Only present when creating
  userId: number;
  name?: string;
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
}
```

## Function Categories

### Authentication Functions
- `loginUser(email, password)` - User login
- `registerUser(email, password)` - User registration
- `getCurrentUser()` - Get current user info
- `uploadAvatar(file)` - Upload user avatar
- `deleteAvatar()` - Delete user avatar
- `updateUserPreferences(preferences)` - Update user preferences

### Vehicle Functions
- `fetchVehicles()` - Get all vehicles
- `fetchVehiclesPaginated(params)` - Get vehicles with pagination
- `fetchVehicleById(id)` - Get specific vehicle
- `fetchVehicleSuggestions()` - Get autocomplete suggestions
- `createVehicle(vehicle)` - Create new vehicle (admin)
- `updateVehicle(id, vehicle)` - Update vehicle (admin)
- `deleteVehicle(id)` - Delete vehicle (admin)

### Contribution Functions
- `submitContribution(vehicleData, changeType, targetVehicleId)` - Submit contribution
- `fetchMyContributions()` - Get user's contributions
- `fetchAllContributions(params)` - Get all contributions with pagination
- `fetchContributionById(id)` - Get specific contribution
- `voteOnContribution(id)` - Vote on contribution
- `approveContribution(id)` - Approve contribution (moderator/admin)
- `rejectContribution(id, comment)` - Reject contribution (moderator/admin)
- `cancelMyContribution(id)` - Cancel own contribution

### API Key Functions
- `fetchApiKeys()` - Get user's API keys
- `createApiKey(name, expiresAt)` - Create new API key
- `revokeApiKey(id)` - Revoke API key
- `fetchApiUsage()` - Get daily usage statistics
- `fetchRateLimitStatus()` - Get current rate limit status

### Admin Functions
- `fetchAdminUsers(params)` - Get users with admin capabilities
- `fetchAdminUser(id)` - Get specific user
- `updateAdminUser(id, updates)` - Update user information
- `deleteAdminUser(id)` - Delete user account
- `fetchAdminStats()` - Get admin statistics

### Statistics Functions
- `fetchStats()` - Get general database statistics
- `fetchApiUsageStats()` - Get detailed API usage statistics

## Pagination Support

Many list endpoints support pagination:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Example usage
const result = await fetchVehiclesPaginated({
  page: 1,
  limit: 10,
  search: 'Tesla',
  sortBy: 'year',
  sortOrder: 'desc'
});

console.log('Vehicles:', result.data);
console.log('Total pages:', result.pagination.totalPages);
```

## Best Practices

### 1. Always Handle Errors
```typescript
try {
  const result = await apiFunction();
  // Handle success
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API errors specifically
  } else {
    // Handle unexpected errors
  }
}
```

### 2. Use Type Guards
```typescript
function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
```

### 3. Leverage TypeScript
```typescript
// Use interfaces for type safety
const vehicle: Vehicle = {
  make: 'Tesla',
  model: 'Model S',
  year: 2023
};

// TypeScript will catch errors at compile time
const result = await createVehicle(vehicle);
```

### 4. Handle Loading States
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const loadData = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const data = await fetchVehicles();
    // Handle success
  } catch (error) {
    if (error instanceof ApiError) {
      setError(error.message);
    }
  } finally {
    setLoading(false);
  }
};
```

## Migration from Old API Client

If you're updating from the previous API client:

1. **Update imports** - Import specific functions instead of using a general API object
2. **Add error handling** - Use the new ApiError class for better error handling
3. **Use TypeScript interfaces** - Leverage the new type definitions
4. **Update function signatures** - Some functions have updated parameter structures

## Development Tools

### VS Code Integration
The TypeScript interfaces provide excellent IntelliSense support in VS Code:
- Auto-completion for API function parameters
- Type checking for response objects
- Error highlighting for incorrect usage

### Debugging
Use the browser's Network tab to inspect API calls:
- All requests include proper authentication headers
- Error responses include detailed error information
- Rate limiting headers are visible for API key requests

## Support

For issues with the API client:
1. Check the TypeScript compiler errors first
2. Verify authentication is properly configured
3. Check the browser's Network tab for HTTP errors
4. Review the API documentation for endpoint requirements
