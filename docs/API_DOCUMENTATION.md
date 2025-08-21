# EV Database API Documentation

## Overview

The EV Database API is a comprehensive RESTful API for managing electric vehicle data, user contributions, and administrative functions. This documentation provides complete information about all available endpoints, authentication methods, and data schemas.

## OpenAPI Specification Files

The API documentation is split across multiple files for better organization:

### Main Specification
- **`openapi.yaml`** - Core API specification including:
  - General endpoints (health, info, stats)
  - Authentication endpoints
  - Vehicle management
  - Contribution management
  - API key management
  - User management

### Extended Specifications
- **`openapi-admin.yaml`** - Admin-specific endpoints including:
  - Admin user management
  - Webhook configuration and management
  - System settings

- **`openapi-schemas.yaml`** - Additional schemas for:
  - Admin user objects
  - Webhook configurations
  - Notification preferences
  - System settings

## Authentication

The API supports two authentication methods:

### 1. Frontend Authentication (JWT)
- **Purpose**: Used by the frontend application
- **Header**: `X-Frontend-Secret: <frontend-secret>`
- **Token**: JWT token in Authorization header: `Bearer <jwt-token>`
- **Rate Limiting**: No rate limiting applied
- **Usage**: Internal application use only

### 2. External API Authentication (API Key)
- **Purpose**: Used by external applications and integrations
- **Header**: `Authorization: Bearer <api-key>`
- **Rate Limiting**: Applied based on user role
- **Credits**: Consumes API credits per request

## Rate Limiting

API key requests are subject to rate limiting based on user role:

| Role | Requests per Hour |
|------|-------------------|
| MEMBER | 100 |
| MODERATOR | 500 |
| ADMIN | 1000 |

## Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3000/api` |
| Production | `https://api.evdatabase.com/api` |

## Core Endpoints

### General
- `GET /` - API health check
- `GET /info` - API information and available endpoints
- `GET /test` - Test endpoint for connectivity
- `GET /stats` - Database statistics (requires API key)

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info (JWT required)
- `POST /auth/avatar/upload` - Upload user avatar (JWT required)
- `DELETE /auth/avatar` - Delete user avatar (JWT required)
- `PUT /auth/preferences` - Update user preferences (JWT required)

### Vehicles
- `GET /vehicles` - Get all vehicles (paginated, filterable)
- `POST /vehicles` - Create new vehicle (admin only)
- `GET /vehicles/{id}` - Get vehicle by ID
- `PUT /vehicles/{id}` - Update vehicle (admin only)
- `DELETE /vehicles/{id}` - Delete vehicle (admin only)
- `GET /vehicles/suggestions` - Get vehicle suggestions for autocomplete
- `GET /vehicles/suggestions/models/{make}` - Get models for specific make

### Contributions
- `GET /contributions` - Get all contributions (paginated, filterable)
- `POST /contributions` - Submit new contribution (JWT required)
- `GET /contributions/{id}` - Get contribution by ID
- `PUT /contributions/{id}` - Update contribution (owner only, if pending)
- `POST /contributions/{id}/approve` - Approve contribution (moderator/admin)
- `POST /contributions/{id}/reject` - Reject contribution (moderator/admin)
- `POST /contributions/{id}/vote` - Vote on contribution (JWT required)

### API Keys
- `GET /apikeys` - Get user's API keys
- `POST /apikeys` - Create new API key
- `DELETE /apikeys/{id}/revoke` - Revoke API key
- `GET /apikeys/usage/daily` - Get daily usage statistics
- `GET /apikeys/rate-limit-status` - Get current rate limit status

### Users
- `GET /users` - Get all users (requires authentication)
- `GET /users/{id}/notifications` - Get user notifications
- `PUT /users/{id}/notifications/{notificationId}/read` - Mark notification as read
- `PUT /users/{id}/notifications/mark-all-read` - Mark all notifications as read

### Images
- `GET /images/vehicle/{vehicleId}` - Get images for vehicle
- `POST /images/contribute` - Submit image contribution (JWT required)
- `GET /images/contributions/pending` - Get pending image contributions (JWT required)
- `POST /images/contributions/{id}/approve` - Approve image (admin only)
- `POST /images/contributions/{id}/reject` - Reject image (admin only)
- `DELETE /images/{id}` - Delete image (admin only)
- `PUT /images/vehicle/{vehicleId}/order` - Update image display order (admin only)

## Admin Endpoints

### User Management
- `GET /admin/users` - Get all users with admin capabilities
- `PUT /admin/users/{id}` - Update user information
- `DELETE /admin/users/{id}` - Delete user account

### Webhook Management
- `GET /admin/webhooks` - Get all webhook configurations
- `POST /admin/webhooks` - Create new webhook
- `GET /admin/webhooks/{id}` - Get webhook by ID
- `PUT /admin/webhooks/{id}` - Update webhook configuration
- `DELETE /admin/webhooks/{id}` - Delete webhook
- `POST /admin/webhooks/{id}/test` - Test webhook configuration

## Data Models

### Core Models
- **User** - User account information
- **Vehicle** - Electric vehicle data
- **Contribution** - User-submitted vehicle data
- **ApiKey** - API key for external access
- **VehicleImage** - Vehicle image metadata

### Admin Models
- **Webhook** - Webhook configuration
- **AdminSettings** - System configuration settings
- **NotificationPreference** - User notification preferences
- **InAppNotification** - In-app notification data

## Error Handling

The API uses standard HTTP status codes and returns errors in JSON format:

```json
{
  "error": "Error message description"
}
```

### Common Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `413` - Payload Too Large
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Pagination

List endpoints support pagination with the following query parameters:

- `page` - Page number (1-based, default: 1)
- `limit` - Items per page (default: 10, max: 100)

Pagination response format:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering and Sorting

Many list endpoints support filtering and sorting:

### Common Filter Parameters
- `search` - Text search across relevant fields
- `status` - Filter by status (for contributions)
- `role` - Filter by user role
- `make` - Filter by vehicle make
- `year` - Filter by vehicle year

### Common Sort Parameters
- `sortBy` - Field to sort by
- `sortOrder` - Sort direction (`asc` or `desc`)

## Webhook Events

The system supports webhooks for the following events:

- `contribution.submitted` - New contribution submitted
- `contribution.approved` - Contribution approved
- `contribution.rejected` - Contribution rejected
- `user.registered` - New user registered
- `vehicle.created` - New vehicle created
- `vehicle.updated` - Vehicle updated

## Development Tools

### Swagger UI
Access the interactive API documentation at:
- Development: `http://localhost:3000/api/docs`
- Production: `https://api.evdatabase.com/api/docs`

### Postman Collection
Import the OpenAPI specification into Postman for easy testing:
1. Open Postman
2. Click "Import"
3. Select "Link" and enter the OpenAPI specification URL
4. Configure authentication in the collection settings

## Support

For API support and questions:
- Email: support@evdatabase.com
- Documentation: This file and the OpenAPI specifications
- Issues: Report bugs and feature requests through the appropriate channels
