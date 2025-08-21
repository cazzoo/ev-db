# API Security Implementation - Source of Truth

## Overview

This document serves as the **definitive source of truth** for the comprehensive API security system. It documents all endpoints, their authentication requirements, security mechanisms, and implementation details for securing the EV Database API.

## Security Architecture

### Core Principles
1. **API Key Authentication Required**: All data endpoints require valid API keys for external access
2. **Frontend Exemption**: Legitimate frontend requests bypass API key requirements using secret headers
3. **Credit-Based Usage**: Each API call consumes credits (except Admin/Moderator accounts)
4. **Comprehensive Logging**: All API usage is tracked and monitored
5. **Role-Based Access Control**: Different access levels based on user roles

### Authentication Mechanisms

#### 1. API Key Authentication (`apiKeyAuth`)
**Location**: `packages/backend/src/middleware/apiKeyAuth.ts`

**Functionality**:
- Validates API keys from `X-API-Key` or `Authorization: Bearer` headers
- Checks for frontend secret header (`X-Frontend-Secret`) to exempt legitimate frontend requests
- Deducts 1 credit per API call for regular users (Admin/Moderator exempt)
- Logs all API usage with timestamps, paths, and methods
- Handles expired and revoked keys
- Returns appropriate error messages for invalid/missing keys

**Frontend Exemption Logic**:
```typescript
if (frontendSecret === FRONTEND_SECRET) {
  // Allow frontend request without API key validation
  await next();
  return;
}
```

#### 2. API Key Only Authentication (`apiKeyOnlyAuth`)
**Purpose**: For endpoints that should never be accessible via frontend secret
**Usage**: Currently unused but available for strict API-only endpoints

#### 3. Hybrid Authentication (`hybridAuth`)
**Location**: `packages/backend/src/middleware/auth.ts`
**Purpose**: Standardized middleware supporting both JWT (frontend) and API key (external) authentication
**Features**:
- Configurable role requirements (admin, moderator)
- Optional rate limiting control
- Consistent error handling
**Usage**: `hybridAuth()`, `adminHybridAuth`, `moderatorHybridAuth`

#### 4. JWT Authentication (`jwtAuth`)
**Location**: `packages/backend/src/middleware/auth.ts`
**Purpose**: Standard JWT token validation for frontend-only routes
**Usage**: Frontend-only endpoints that require user authentication

#### 5. Role-Based Middleware
- `adminOnly`: Requires ADMIN role
- `moderatorOrAdmin`: Requires ADMIN or MODERATOR role
- `adminAuth`: Combined JWT + Admin role check
- `moderatorAuth`: Combined JWT + Moderator/Admin role check

## Complete Endpoint Security Matrix

### Public Endpoints (No Authentication)
| Endpoint | Method | Description | Security |
|----------|--------|-------------|----------|
| `/` | GET | API root | None |
| `/auth/register` | POST | User registration | None |
| `/auth/login` | POST | User login | None |

### API Key Protected Endpoints (External Access)
| Endpoint | Method | Description | Auth Required | Credit Cost | Role Restrictions |
|----------|--------|-------------|---------------|-------------|-------------------|
| `/vehicles` | GET | List all vehicles | API Key | 1 | None |
| `/vehicles/:id` | GET | Get specific vehicle | API Key | 1 | None |
| `/vehicles` | POST | Create vehicle | API Key + Admin | 1* | ADMIN only |
| `/vehicles/:id` | PUT | Update vehicle | API Key + Admin | 1* | ADMIN only |
| `/vehicles/:id` | DELETE | Delete vehicle | API Key + Admin | 1* | ADMIN only |
| `/users` | GET | List users | API Key | 1 | None |
| `/stats` | GET | Application statistics | API Key | 1 | None |
| `/test` | GET | API key validation test | API Key | 0 | None |

*Admin/Moderator accounts don't consume credits

### Contribution Endpoints (API Key Protected)
| Endpoint | Method | Description | Auth Required | Credit Cost | Role Restrictions |
|----------|--------|-------------|---------------|-------------|-------------------|
| `/contributions` | GET | List contributions | API Key | 1 | None |
| `/contributions` | POST | Submit contribution | API Key | 0 | None |
| `/contributions/pending` | GET | Pending contributions | API Key | 1 | None |
| `/contributions/my` | GET | User's contributions | API Key | 1 | None |
| `/contributions/:id/vote` | POST | Vote on contribution | API Key | 0 | None |
| `/contributions/:id/approve` | POST | Approve contribution | API Key | 0 | ADMIN/MODERATOR |
| `/contributions/:id/reject` | POST | Reject contribution | API Key | 0 | ADMIN/MODERATOR |

### Hybrid Authentication Endpoints (JWT for Frontend, API Key for External)
| Endpoint | Method | Description | Frontend Auth | External Auth | Credit Cost |
|----------|--------|-------------|---------------|---------------|-------------|
| `/apikeys` | GET | List user's API keys | JWT | API Key | 0 |
| `/apikeys` | POST | Create API key | JWT | API Key | 0 |
| `/apikeys/:id/revoke` | POST | Revoke API key | JWT | API Key | 0 |
| `/apikeys/usage/daily` | GET | Daily usage stats | JWT | API Key | 0 |
| `/apikeys/rate-limit-status` | GET | Rate limit status | JWT | API Key | 0 |

### JWT Only Endpoints (Frontend Access Only)
| Endpoint | Method | Description | Auth Required | Role Restrictions |
|----------|--------|-------------|---------------|-------------------|
| `/auth/me` | GET | Current user data | JWT | None |
| `/auth/avatar/upload` | POST | Upload avatar | JWT | None |
| `/auth/avatar` | DELETE | Delete avatar | JWT | None |
| `/auth/preferences` | PUT | Update preferences | JWT | None |

### Admin Only Endpoints (JWT + Admin Role)
| Endpoint | Method | Description | Auth Required | Role Required |
|----------|--------|-------------|---------------|---------------|
| `/admin/*` | ALL | All admin endpoints | JWT + Role | ADMIN |
| `/seed/*` | ALL | Seeding endpoints | JWT + Role | ADMIN |

## Environment Configuration

### Required Environment Variables

#### Backend (.env)
```bash
# Security Secrets
FRONTEND_SECRET=frontend-secret-key-change-in-production-12345
JWT_SECRET=your-jwt-secret-key-change-in-production-67890

# Database
DATABASE_URL=sqlite:./sqlite.db

# Optional
NODE_ENV=development
```

#### Frontend (.env)
```bash
# Must match backend FRONTEND_SECRET
VITE_FRONTEND_SECRET=frontend-secret-key-change-in-production-12345
```

### CORS Configuration
```typescript
app.use('*', cors({
  origin: 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Frontend-Secret'],
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
  credentials: true,
  maxAge: 86400,
}))
```

## Credit System

### Credit Consumption Rules
1. **Regular Users**: 1 credit per API call
2. **Admin/Moderator**: Unlimited API calls (no credit deduction)
3. **Frontend Requests**: No credit consumption (exempt via secret header)
4. **Failed Requests**: No credit deduction

### Credit Balance Checks
- Performed before API call processing
- Returns HTTP 402 (Payment Required) when insufficient credits
- Balance updated atomically after successful validation

### Usage Logging
All API calls are logged to `api_usage` table with:
- `api_key_id`: Associated API key
- `used_at`: Timestamp
- `path`: Request path
- `method`: HTTP method

## Rate Limiting System

### Rate Limiting Architecture
**Location**: `packages/backend/src/middleware/rateLimiting.ts`

The rate limiting system provides per-user protection against API abuse while maintaining seamless frontend access.

### Rate Limit Configuration
```typescript
const RATE_LIMITS = {
  frontend: null,     // No limits for frontend requests
  ADMIN: null,        // No limits for admin users
  MODERATOR: null,    // No limits for moderator users
  MEMBER: {
    requests: 1000,   // 1000 requests per hour
    window: 3600,     // 1 hour window
    burst: 20         // max 20 requests per minute
  },
  test: {
    requests: 100,    // 100 test requests per hour
    window: 3600,
  }
}
```

### Rate Limiting Rules
1. **Frontend Requests**: No rate limits (identified by `X-Frontend-Secret` header)
2. **Admin/Moderator Users**: Unlimited API access
3. **Regular Members**: 1000 requests/hour + 20 requests/minute burst protection
4. **Test Endpoint**: Special limit of 100 requests/hour
5. **Per-User Tracking**: Limits applied per user ID, not per API key

### Rate Limit Headers
All rate-limited responses include headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `X-RateLimit-Burst-Limit`: Burst limit (if applicable)
- `X-RateLimit-Burst-Remaining`: Burst requests remaining

### Rate Limit Exceeded Response
```json
{
  "error": "Rate limit exceeded: Too many requests",
  "retryAfter": 1800,
  "limit": 1000,
  "window": "3600 seconds"
}
```

### Rate Limit Status Endpoint
`GET /apikeys/rate-limit-status` returns current rate limit status:
```json
{
  "limit": 1000,
  "remaining": 847,
  "resetTime": 1704067200000
}
```

For unlimited users (Admin/Moderator):
```json
{
  "unlimited": true
}
```

## Error Response Standards

### Authentication Errors
```json
// Missing API Key
{
  "error": "API key required. Please provide your API key in the X-API-Key header or Authorization header."
}

// Invalid API Key
{
  "error": "Invalid or expired API key. Please check your API key or generate a new one."
}

// Insufficient Credits
{
  "error": "Insufficient credits. Please purchase more credits to continue using the API."
}

// Unauthorized Role
{
  "error": "Unauthorized: Admin access required"
}
```

## Frontend Integration

### Automatic Header Injection
```typescript
// packages/frontend/src/services/api.ts
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'X-Frontend-Secret': FRONTEND_SECRET,
  };
};
```

### Frontend Request Flow
1. All API requests include `X-Frontend-Secret` header
2. Backend recognizes frontend requests and bypasses API key validation
3. JWT token used for user authentication where required
4. No credit consumption for frontend requests

## External API Usage

### Authentication Methods
```bash
# Method 1: X-API-Key Header (Recommended)
curl -X GET "http://localhost:3000/api/vehicles" \
  -H "X-API-Key: your-api-key-here"

# Method 2: Authorization Header
curl -X GET "http://localhost:3000/api/vehicles" \
  -H "Authorization: Bearer your-api-key-here"
```

### API Key Management
```bash
# Test API Key
curl -X GET "http://localhost:3000/api/test" \
  -H "X-API-Key: your-api-key-here"

# Get API Keys (requires existing API key)
curl -X GET "http://localhost:3000/api/apikeys" \
  -H "X-API-Key: your-api-key-here"

# Create New API Key
curl -X POST "http://localhost:3000/api/apikeys" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key-here" \
  -d '{"name": "My API Key", "expiresAt": "2024-12-31T23:59:59Z"}'

# Revoke API Key
curl -X POST "http://localhost:3000/api/apikeys/123/revoke" \
  -H "X-API-Key: your-api-key-here"
```

## Database Schema

### API Keys Table (`api_keys`)
```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  key TEXT NOT NULL UNIQUE,
  name TEXT,
  expires_at INTEGER, -- Unix timestamp
  created_at INTEGER NOT NULL, -- Unix timestamp
  revoked_at INTEGER -- Unix timestamp
);
```

### API Usage Table (`api_usage`)
```sql
CREATE TABLE api_usage (
  id INTEGER PRIMARY KEY,
  api_key_id INTEGER NOT NULL REFERENCES api_keys(id),
  used_at INTEGER NOT NULL, -- Unix timestamp
  path TEXT NOT NULL,
  method TEXT NOT NULL
);
```

### Users Table (Credit System)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'MEMBER' NOT NULL, -- MEMBER, MODERATOR, ADMIN
  app_currency_balance INTEGER DEFAULT 0 NOT NULL,
  avatar_url TEXT,
  theme TEXT DEFAULT 'light'
);
```

## Security Implementation Details

### API Key Generation
- Uses `crypto.randomUUID()` twice, concatenated without hyphens
- Results in 64-character hexadecimal string
- Stored as plain text (keys are not sensitive like passwords)
- Uniqueness enforced at database level

### API Key Validation Process
1. Extract key from `X-API-Key` or `Authorization` header
2. Query database with joins to get key details and user info
3. Check if key exists and is not revoked
4. Check if key is not expired (if expiration set)
5. Verify user has sufficient credits (unless Admin/Moderator)
6. Deduct credit and log usage
7. Store key info in request context
8. Proceed to endpoint handler

### Frontend Secret Validation
- Constant-time comparison to prevent timing attacks
- Environment variable based configuration
- Bypasses all API key validation when matched
- No credit consumption for frontend requests

### Role-Based Access Control
- Roles stored in users table: `MEMBER`, `MODERATOR`, `ADMIN`
- Middleware checks JWT payload for role information
- Admin endpoints require exact role match
- Some endpoints allow both ADMIN and MODERATOR roles

## Monitoring and Analytics

### Usage Tracking
- Every API call logged with timestamp, path, method
- Linked to specific API key for user attribution
- Enables usage analytics and billing
- Supports rate limiting and abuse detection

### Credit Monitoring
- Real-time balance tracking
- Automatic deduction on successful API calls
- Balance checks prevent overdraft
- Admin/Moderator accounts exempt from deduction

### Security Monitoring
- Failed authentication attempts logged
- Invalid API key usage tracked
- Unusual usage patterns detectable
- Revoked key usage attempts logged

## Testing and Validation

### Security Test Scenarios
1. **Unauthenticated Access**: Verify all protected endpoints reject requests without API keys
2. **Invalid API Keys**: Confirm proper error responses for non-existent keys
3. **Expired Keys**: Test that expired keys are properly rejected
4. **Revoked Keys**: Ensure revoked keys cannot be used
5. **Insufficient Credits**: Verify 402 responses when balance is zero
6. **Frontend Exemption**: Confirm frontend secret bypasses API key requirements
7. **Role Restrictions**: Test that role-based endpoints enforce permissions
8. **Credit Deduction**: Verify credits are properly deducted for API calls

### Test Endpoints
- `GET /test`: Dedicated endpoint for API key validation testing
- Returns key info, user info, and timestamp when successful
- Consumes 1 credit like other API calls
- Useful for integration testing and monitoring

## Production Deployment Checklist

### Security Configuration
- [ ] Generate strong, unique `FRONTEND_SECRET` (min 32 characters)
- [ ] Generate strong, unique `JWT_SECRET` (min 32 characters)
- [ ] Update CORS origins for production domains
- [ ] Enable HTTPS for all API communications
- [ ] Configure proper database permissions
- [ ] Set up API rate limiting (if needed)

### Monitoring Setup
- [ ] Configure API usage monitoring
- [ ] Set up credit balance alerts
- [ ] Monitor failed authentication attempts
- [ ] Track API key creation/revocation patterns
- [ ] Set up performance monitoring for auth middleware

### Operational Procedures
- [ ] Document API key rotation procedures
- [ ] Establish credit top-up processes
- [ ] Create incident response procedures
- [ ] Set up backup and recovery for API keys
- [ ] Document user onboarding for API access

## Troubleshooting Guide

### Common Issues

#### "API key required" Error
- **Cause**: Missing `X-API-Key` or `Authorization` header
- **Solution**: Include API key in request headers
- **Frontend**: Check if `X-Frontend-Secret` header is included

#### "Invalid or expired API key" Error
- **Cause**: API key doesn't exist, is revoked, or expired
- **Solution**: Generate new API key or check expiration date
- **Debug**: Verify key format and check database records

#### "Insufficient credits" Error
- **Cause**: User account balance is zero or negative
- **Solution**: Add credits to user account
- **Admin**: Check if user should have unlimited access

#### Frontend Requests Failing
- **Cause**: `X-Frontend-Secret` header missing or incorrect
- **Solution**: Verify environment variable matches backend
- **Debug**: Check CORS configuration and header spelling

### Debug Information
- API key validation errors logged to console
- Request context includes user and key information
- Database queries can be traced for performance issues
- CORS errors visible in browser developer tools

## API Versioning and Compatibility

### Current Version
- API Version: 1.0
- Base Path: `/api`
- Backward Compatibility: Maintained for all documented endpoints

### Future Considerations
- API versioning strategy for breaking changes
- Deprecation notices for endpoint changes
- Migration guides for API key format changes
- Compatibility testing for client libraries

## Conclusion

This comprehensive security implementation provides:

1. **Complete API Protection**: All data endpoints secured with API key authentication
2. **Flexible Access Control**: Multiple authentication methods for different use cases
3. **Usage Monitoring**: Complete tracking and analytics for API consumption
4. **Credit Management**: Fair usage system with role-based exemptions
5. **Frontend Integration**: Seamless user experience with security exemptions
6. **Production Ready**: Comprehensive error handling and monitoring capabilities

The system is designed to be secure by default while maintaining usability for both frontend users and external API consumers. All security mechanisms are documented, tested, and ready for production deployment.
