import { useState } from 'react';
import { DocumentTextIcon, KeyIcon, UserIcon, TruckIcon, PencilSquareIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const ApiDocumentationPage = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const sections = [
    { id: 'overview', title: 'Overview', icon: DocumentTextIcon },
    { id: 'authentication', title: 'Authentication', icon: KeyIcon },
    { id: 'auth-endpoints', title: 'Auth Endpoints', icon: UserIcon },
    { id: 'api-keys', title: 'API Keys', icon: KeyIcon },
    { id: 'vehicles', title: 'Vehicles', icon: TruckIcon },
    { id: 'contributions', title: 'Contributions', icon: PencilSquareIcon },
    { id: 'admin', title: 'Admin', icon: Cog6ToothIcon },
    { id: 'testing', title: 'API Testing', icon: DocumentTextIcon },
  ];

  const baseUrl = 'http://localhost:3000/api';

  const CodeBlock = ({ children, title }: { children: string; title?: string }) => {
    const copyToClipboard = () => {
      navigator.clipboard.writeText(children);
    };

    return (
      <div className="mockup-code bg-base-200 text-sm relative group">
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 btn btn-xs btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
          title="Copy to clipboard"
        >
          📋
        </button>
        {title && <pre data-prefix="$"><code>{title}</code></pre>}
        <pre><code>{children}</code></pre>
      </div>
    );
  };

  const EndpointCard = ({ method, path, description, auth, body, response, example }: {
    method: string;
    path: string;
    description: string;
    auth?: string;
    body?: string;
    response?: string;
    example?: string;
  }) => (
    <div className="card bg-base-100 shadow-sm border border-base-300 mb-4">
      <div className="card-body p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`badge ${
            method === 'GET' ? 'badge-success' :
            method === 'POST' ? 'badge-primary' :
            method === 'PUT' ? 'badge-warning' :
            method === 'DELETE' ? 'badge-error' : 'badge-neutral'
          }`}>
            {method}
          </span>
          <code className="text-sm font-mono">{path}</code>
          {auth && <span className="badge badge-outline badge-sm">🔒 {auth}</span>}
        </div>
        <p className="text-sm text-base-content/70 mb-3">{description}</p>

        {body && (
          <div className="mb-3">
            <h4 className="font-semibold text-sm mb-1">Request Body:</h4>
            <CodeBlock>{body}</CodeBlock>
          </div>
        )}

        {response && (
          <div className="mb-3">
            <h4 className="font-semibold text-sm mb-1">Response:</h4>
            <CodeBlock>{response}</CodeBlock>
          </div>
        )}

        {example && (
          <div>
            <h4 className="font-semibold text-sm mb-1">Example:</h4>
            <CodeBlock>{example}</CodeBlock>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">API Overview</h2>
            <div className="prose max-w-none">
              <p className="text-base-content/70 mb-4">
                The EV Database API provides access to electric vehicle data, user contributions, and administrative functions.
                All API endpoints are prefixed with <code className="bg-base-200 px-2 py-1 rounded">/api</code>.
              </p>

              <div className="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h3 className="font-bold">Base URL</h3>
                  <p><code>{baseUrl}</code></p>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-3">Response Format</h3>
              <p className="mb-3">All responses are in JSON format. Successful responses return the requested data, while errors return an object with an <code>error</code> field.</p>

              <CodeBlock title="Success Response Example">
{`{
  "id": 1,
  "make": "Tesla",
  "model": "Model 3",
  "year": 2023
}`}
              </CodeBlock>

              <CodeBlock title="Error Response Example">
{`{
  "error": "Invalid credentials"
}`}
              </CodeBlock>

              <h3 className="text-xl font-semibold mb-3 mt-6">Rate Limiting</h3>
              <p className="mb-3">API usage is tracked per API key. Check your dashboard for usage statistics.</p>
            </div>
          </div>
        );

      case 'authentication':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Authentication</h2>
            <div className="prose max-w-none">
              <p className="text-base-content/70 mb-4">
                All API endpoints require authentication using API keys. JWT tokens are not supported for external API access.
              </p>

              <h3 className="text-xl font-semibold mb-3">API Key Authentication</h3>
              <p className="mb-3">Generate API keys from your user dashboard and include them in your requests using one of these methods:</p>

              <h4 className="text-lg font-medium mb-2">Method 1: X-API-Key Header (Recommended)</h4>
              <CodeBlock>
{`X-API-Key: your-api-key-here`}
              </CodeBlock>

              <h4 className="text-lg font-medium mb-2 mt-4">Method 2: Authorization Header</h4>
              <CodeBlock>
{`Authorization: Bearer your-api-key-here`}
              </CodeBlock>

              <h3 className="text-xl font-semibold mb-3 mt-6">Credit System</h3>
              <p className="mb-3">Most API calls consume 1 credit from your account balance. Some endpoints are free to encourage usage:</p>
              <div className="bg-base-200 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">🆓 Free Endpoints (0 credits):</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>API key testing: <code>/test</code></li>
                  <li>API key management: <code>/apikeys/*</code></li>
                  <li>Submit contributions: <code>POST /contributions</code></li>
                  <li>Vote on contributions: <code>POST /contributions/:id/vote</code></li>
                  <li>Approve/reject contributions: <code>POST /contributions/:id/approve|reject</code></li>
                </ul>
              </div>
              <p className="mb-3 text-sm text-base-content/70">💡 Admin and Moderator accounts have unlimited API calls for all endpoints.</p>

              <h3 className="text-xl font-semibold mb-3 mt-6">Rate Limiting</h3>
              <p className="mb-3">To ensure fair usage and prevent abuse, API calls are rate limited per user:</p>
              <div className="bg-base-200 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">📊 Regular Users:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• 1,000 requests per hour</li>
                      <li>• 20 requests per minute (burst)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">🔓 Admin/Moderator:</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Unlimited requests</li>
                      <li>• No rate limits</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="mb-3 text-sm text-base-content/70">Rate limits are tracked per user account, not per API key. Check your current rate limit status using <code>GET /apikeys/rate-limit-status</code>.</p>

              <h3 className="text-xl font-semibold mb-3 mt-6">Security Features</h3>
              <ul className="list-disc list-inside mb-4 space-y-1">
                <li>API keys can be set to expire at a specific date</li>
                <li>API keys can be revoked instantly from your dashboard</li>
                <li>All API usage is logged and tracked</li>
                <li>Per-user rate limiting prevents abuse</li>
                <li>Automatic cleanup of expired rate limit data</li>
              </ul>

              <div className="alert alert-warning mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="font-bold">Security Note</h3>
                  <p>Keep your API keys secure. Never expose them in client-side code or public repositories.</p>
                </div>
              </div>

              <div className="alert alert-info mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>API keys consume credits for each request. Monitor your usage in the dashboard to avoid service interruption.</span>
              </div>
            </div>
          </div>
        );

      case 'auth-endpoints':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Authentication Endpoints</h2>

            <EndpointCard
              method="POST"
              path="/auth/register"
              description="Register a new user account"
              body={`{
  "email": "user@example.com",
  "password": "securepassword"
}`}
              response={`{
  "token": "jwt-token-here",
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "role": "MEMBER"
  }
}`}
            />

            <EndpointCard
              method="POST"
              path="/auth/login"
              description="Login with email and password"
              body={`{
  "email": "user@example.com",
  "password": "securepassword"
}`}
              response={`{
  "token": "jwt-token-here",
  "user": {
    "userId": 1,
    "email": "user@example.com",
    "role": "MEMBER"
  }
}`}
            />

            <EndpointCard
              method="GET"
              path="/auth/me"
              description="Get current user information"
              auth="JWT"
              response={`{
  "userId": 1,
  "email": "user@example.com",
  "role": "MEMBER",
  "appCurrencyBalance": 100,
  "avatarUrl": null,
  "theme": "light"
}`}
            />

            <EndpointCard
              method="POST"
              path="/auth/avatar/upload"
              description="Upload user avatar (multipart/form-data)"
              auth="JWT"
              body="Form data with 'avatar' file field (max 2MB)"
              response={`{
  "message": "Avatar uploaded successfully",
  "avatarUrl": "auth/avatar/filename.svg"
}`}
            />

            <EndpointCard
              method="DELETE"
              path="/auth/avatar"
              description="Delete user avatar"
              auth="JWT"
              response={`{
  "message": "Avatar deleted successfully"
}`}
            />

            <EndpointCard
              method="PUT"
              path="/auth/preferences"
              description="Update user preferences"
              auth="JWT"
              body={`{
  "theme": "dark"
}`}
              response={`{
  "theme": "dark"
}`}
            />
          </div>
        );

      case 'api-keys':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">API Key Management</h2>

            <div className="alert alert-info mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>API key endpoints support both API key authentication (for external access) and JWT authentication (for frontend access).</span>
            </div>

            <EndpointCard
              method="GET"
              path="/apikeys"
              description="Get all API keys for the authenticated user"
              auth="API Key or JWT"
              response={`[
  {
    "id": 1,
    "key": "abc123...",
    "userId": 1,
    "name": "My API Key",
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "revokedAt": null
  }
]`}
            />

            <EndpointCard
              method="POST"
              path="/apikeys"
              description="Create a new API key"
              auth="API Key or JWT"
              body={`{
  "name": "My New API Key",
  "expiresAt": "2024-12-31T23:59:59Z"
}`}
              response={`{
  "apiKey": "abc123def456...",
  "id": 2
}`}
            />

            <EndpointCard
              method="POST"
              path="/apikeys/:id/revoke"
              description="Revoke an API key"
              auth="API Key or JWT"
              response={`{
  "message": "Revoked"
}`}
            />

            <EndpointCard
              method="GET"
              path="/apikeys/usage/daily"
              description="Get daily API usage statistics"
              auth="API Key or JWT"
              response={`[
  {
    "day": "2024-01-01",
    "count": 150
  },
  {
    "day": "2024-01-02",
    "count": 89
  }
]`}
            />

            <EndpointCard
              method="GET"
              path="/apikeys/rate-limit-status"
              description="Check your current rate limit status"
              auth="API Key or JWT"
              response={`{
  "limit": 1000,
  "remaining": 847,
  "resetTime": 1704067200000
}`}
            />

            <EndpointCard
              method="GET"
              path="/test"
              description="Test API key validity (Free - 0 credits)"
              auth="API Key"
              response={`{
  "message": "API key is valid and working!",
  "keyId": 1,
  "userId": 1,
  "userRole": "MEMBER",
  "timestamp": "2024-01-01T12:00:00.000Z"
}`}
            />
          </div>
        );

      case 'vehicles':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Vehicle Endpoints</h2>

            <EndpointCard
              method="GET"
              path="/vehicles"
              description="Get all vehicles in the database"
              response={`[
  {
    "id": 1,
    "make": "Tesla",
    "model": "Model 3",
    "year": 2023,
    "batteryCapacity": 75,
    "range": 500,
    "chargingSpeed": 250
  }
]`}
            />

            <EndpointCard
              method="GET"
              path="/vehicles/:id"
              description="Get a specific vehicle by ID"
              response={`{
  "id": 1,
  "make": "Tesla",
  "model": "Model 3",
  "year": 2023,
  "batteryCapacity": 75,
  "range": 500,
  "chargingSpeed": 250
}`}
            />

            <EndpointCard
              method="POST"
              path="/vehicles"
              description="Create a new vehicle (Admin only)"
              auth="JWT (Admin)"
              body={`{
  "make": "Tesla",
  "model": "Model Y",
  "year": 2023,
  "batteryCapacity": 75,
  "range": 450,
  "chargingSpeed": 250
}`}
              response={`{
  "message": "Vehicle created successfully",
  "vehicle": {
    "id": 2,
    "make": "Tesla",
    "model": "Model Y",
    "year": 2023,
    "batteryCapacity": 75,
    "range": 450,
    "chargingSpeed": 250
  }
}`}
            />

            <EndpointCard
              method="PUT"
              path="/vehicles/:id"
              description="Update a vehicle (Admin only)"
              auth="JWT (Admin)"
              body={`{
  "make": "Tesla",
  "model": "Model 3",
  "year": 2024,
  "batteryCapacity": 80,
  "range": 520,
  "chargingSpeed": 250
}`}
              response={`{
  "message": "Vehicle updated successfully",
  "vehicle": { ... }
}`}
            />

            <EndpointCard
              method="DELETE"
              path="/vehicles/:id"
              description="Delete a vehicle (Admin only)"
              auth="JWT (Admin)"
              response={`{
  "message": "Vehicle deleted successfully"
}`}
            />
          </div>
        );

      case 'contributions':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Contribution Endpoints</h2>

            <div className="alert alert-success mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-bold">Free Contribution Actions!</h3>
                <p>To encourage community participation, these contribution actions are free (0 credits):</p>
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>Submit new contributions (POST /contributions)</li>
                  <li>Vote on contributions (POST /contributions/:id/vote)</li>
                  <li>Approve/reject contributions (POST /contributions/:id/approve|reject)</li>
                </ul>
              </div>
            </div>

            <EndpointCard
              method="GET"
              path="/contributions/pending"
              description="Get all pending contributions"
              auth="JWT"
              response={`[
  {
    "id": 1,
    "vehicleId": 1,
    "userId": 2,
    "type": "UPDATE",
    "data": {
      "batteryCapacity": 80,
      "range": 520
    },
    "status": "PENDING",
    "createdAt": "2023-12-01T10:00:00Z"
  }
]`}
            />

            <EndpointCard
              method="POST"
              path="/contributions"
              description="Submit a new contribution (Free - 0 credits)"
              auth="JWT"
              body={`{
  "vehicleId": 1,
  "type": "UPDATE",
  "data": {
    "batteryCapacity": 80,
    "range": 520
  }
}`}
              response={`{
  "message": "Contribution submitted successfully",
  "contribution": {
    "id": 1,
    "vehicleId": 1,
    "userId": 2,
    "type": "UPDATE",
    "data": { ... },
    "status": "PENDING"
  }
}`}
            />

            <EndpointCard
              method="GET"
              path="/contributions/my"
              description="Get current user's contributions"
              auth="JWT"
              response={`[
  {
    "id": 1,
    "vehicleId": 1,
    "type": "UPDATE",
    "data": { ... },
    "status": "PENDING",
    "createdAt": "2023-12-01T10:00:00Z"
  }
]`}
            />

            <EndpointCard
              method="POST"
              path="/contributions/:id/vote"
              description="Vote on a contribution (Free - 0 credits)"
              auth="JWT"
              body={`{
  "vote": "APPROVE"
}`}
              response={`{
  "message": "Vote recorded successfully"
}`}
            />

            <EndpointCard
              method="POST"
              path="/contributions/:id/approve"
              description="Approve a contribution (Free - 0 credits, Moderator/Admin only)"
              auth="JWT (Moderator/Admin)"
              response={`{
  "message": "Contribution approved successfully"
}`}
            />

            <EndpointCard
              method="POST"
              path="/contributions/:id/reject"
              description="Reject a contribution (Free - 0 credits, Moderator/Admin only)"
              auth="JWT (Moderator/Admin)"
              body={`{
  "reason": "Insufficient evidence"
}`}
              response={`{
  "message": "Contribution rejected successfully"
}`}
            />

            <EndpointCard
              method="DELETE"
              path="/contributions/:id"
              description="Cancel own contribution"
              auth="JWT"
              response={`{
  "message": "Contribution cancelled successfully"
}`}
            />
          </div>
        );

      case 'admin':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Admin Endpoints</h2>
            <div className="alert alert-warning mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="font-bold">Admin Access Required</h3>
                <p>All endpoints in this section require Admin role authentication.</p>
              </div>
            </div>

            <EndpointCard
              method="GET"
              path="/admin/users"
              description="Get all users with pagination and filtering"
              auth="JWT (Admin)"
              example={`GET /admin/users?page=1&limit=10&search=john&role=MEMBER&sortBy=email&sortOrder=asc`}
              response={`{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "role": "MEMBER",
      "appCurrencyBalance": 100,
      "avatarUrl": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}`}
            />

            <EndpointCard
              method="GET"
              path="/admin/users/:id"
              description="Get specific user by ID"
              auth="JWT (Admin)"
              response={`{
  "id": 1,
  "email": "user@example.com",
  "role": "MEMBER",
  "appCurrencyBalance": 100,
  "avatarUrl": null
}`}
            />

            <EndpointCard
              method="PUT"
              path="/admin/users/:id"
              description="Update user information"
              auth="JWT (Admin)"
              body={`{
  "email": "newemail@example.com",
  "role": "MODERATOR",
  "appCurrencyBalance": 200,
  "password": "newpassword"
}`}
              response={`{
  "message": "User updated successfully",
  "user": { ... }
}`}
            />

            <EndpointCard
              method="DELETE"
              path="/admin/users/:id"
              description="Delete a user"
              auth="JWT (Admin)"
              response={`{
  "message": "User deleted successfully"
}`}
            />

            <EndpointCard
              method="GET"
              path="/admin/stats"
              description="Get admin dashboard statistics"
              auth="JWT (Admin)"
              response={`{
  "totalUsers": 150,
  "roleStats": {
    "MEMBER": 140,
    "MODERATOR": 8,
    "ADMIN": 2
  },
  "topBalances": [
    {
      "id": 1,
      "email": "user@example.com",
      "appCurrencyBalance": 1000
    }
  ],
  "totalCurrency": 15000
}`}
            />

            <EndpointCard
              method="DELETE"
              path="/admin/users/:id/avatar"
              description="Delete user's avatar"
              auth="JWT (Admin)"
              response={`{
  "message": "Avatar deleted successfully"
}`}
            />

            <h3 className="text-xl font-semibold mb-3 mt-6">API Key Management</h3>

            <EndpointCard
              method="GET"
              path="/apikeys"
              description="Get current user's API keys"
              auth="JWT"
              response={`[
  {
    "id": 1,
    "name": "My API Key",
    "key": "ak_1234567890abcdef",
    "expiresAt": null,
    "createdAt": "2023-12-01T10:00:00Z",
    "revokedAt": null
  }
]`}
            />

            <EndpointCard
              method="POST"
              path="/apikeys"
              description="Create a new API key"
              auth="JWT"
              body={`{
  "name": "My API Key",
  "expiresAt": "2024-12-01T00:00:00Z"
}`}
              response={`{
  "apiKey": "ak_1234567890abcdef",
  "id": 1
}`}
            />

            <EndpointCard
              method="POST"
              path="/apikeys/:id/revoke"
              description="Revoke an API key"
              auth="JWT"
              response={`{
  "message": "API key revoked successfully"
}`}
            />

            <EndpointCard
              method="GET"
              path="/apikeys/usage/daily"
              description="Get daily API usage statistics"
              auth="JWT"
              response={`[
  {
    "day": "2023-12-01",
    "count": 25
  },
  {
    "day": "2023-12-02",
    "count": 18
  }
]`}
            />
          </div>
        );

      case 'testing':
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">API Testing</h2>
            <div className="prose max-w-none">
              <p className="text-base-content/70 mb-4">
                Test your API access with these simple examples. You can use tools like curl, Postman, or any HTTP client.
              </p>

              <h3 className="text-xl font-semibold mb-3">API Key Test Endpoint</h3>
              <p className="mb-3">Test your API key with this dedicated endpoint (Free - no credits consumed):</p>

              <CodeBlock title="curl">
{`curl -X GET "${baseUrl}/test" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here"`}
              </CodeBlock>

              <div className="alert alert-info mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>The test endpoint is free and has a generous rate limit of 100 requests per hour for testing purposes.</span>
              </div>

              <h3 className="text-xl font-semibold mb-3 mt-6">Get All Vehicles</h3>
              <p className="mb-3">This endpoint requires API key authentication:</p>

              <CodeBlock title="curl">
{`curl -X GET "${baseUrl}/vehicles" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here"`}
              </CodeBlock>

              <h3 className="text-xl font-semibold mb-3 mt-6">API Key Management</h3>
              <p className="mb-3">Manage your API keys (Free - no credits consumed):</p>

              <CodeBlock title="Get API Keys">
{`curl -X GET "${baseUrl}/apikeys" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here"`}
              </CodeBlock>

              <CodeBlock title="Create API Key">
{`curl -X POST "${baseUrl}/apikeys" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here" \\
  -d '{"name": "My API Key", "expiresAt": "2024-12-31T23:59:59Z"}'`}
              </CodeBlock>

              <CodeBlock title="Check Rate Limit Status">
{`curl -X GET "${baseUrl}/apikeys/rate-limit-status" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here"`}
              </CodeBlock>

              <CodeBlock title="Revoke API Key">
{`curl -X POST "${baseUrl}/apikeys/123/revoke" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key-here"`}
              </CodeBlock>

              <div className="alert alert-success mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>All API key management endpoints are free and don't consume credits!</span>
              </div>

              <CodeBlock title="JavaScript (fetch)">
{`fetch('${baseUrl}/vehicles')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`}
              </CodeBlock>

              <CodeBlock title="Python (requests)">
{`import requests

response = requests.get('${baseUrl}/vehicles')
if response.status_code == 200:
    data = response.json()
    print(data)
else:
    print(f"Error: {response.status_code}")`}
              </CodeBlock>

              <h3 className="text-xl font-semibold mb-3 mt-6">Testing with API Key</h3>
              <p className="mb-3">Once you have an API key, test authenticated endpoints:</p>

              <CodeBlock title="curl with API Key">
{`curl -X GET "${baseUrl}/apikeys" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE"`}
              </CodeBlock>

              <CodeBlock title="JavaScript with API Key">
{`const apiKey = 'YOUR_API_KEY_HERE';

fetch('${baseUrl}/apikeys', {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': \`Bearer \${apiKey}\`
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`}
              </CodeBlock>

              <div className="alert alert-info mt-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div>
                  <h3 className="font-bold">Testing Tips</h3>
                  <ul className="list-disc list-inside mt-2">
                    <li>Start with the <code>/test</code> endpoint to validate your API key (free)</li>
                    <li>Generate an API key from your dashboard to test authenticated endpoints</li>
                    <li>Check rate limit headers in responses: <code>X-RateLimit-Remaining</code></li>
                    <li>Use <code>/apikeys/rate-limit-status</code> to monitor your usage</li>
                    <li>Check the browser's Network tab for detailed request/response information</li>
                    <li>Use the copy button on code blocks to quickly copy examples</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-3 mt-6">Rate Limiting Headers</h3>
              <p className="mb-3">All API responses include rate limiting information in headers:</p>

              <CodeBlock title="Response Headers">
{`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1704067200
X-RateLimit-Burst-Limit: 20
X-RateLimit-Burst-Remaining: 18`}
              </CodeBlock>

              <h3 className="text-xl font-semibold mb-3 mt-6">Common Error Responses</h3>

              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr>
                      <th>Status Code</th>
                      <th>Meaning</th>
                      <th>Common Causes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="badge badge-error">400</span></td>
                      <td>Bad Request</td>
                      <td>Invalid request body or missing required fields</td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-warning">401</span></td>
                      <td>Unauthorized</td>
                      <td>Missing or invalid API key/JWT token</td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-warning">402</span></td>
                      <td>Payment Required</td>
                      <td>Insufficient credits in your account</td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-warning">403</span></td>
                      <td>Forbidden</td>
                      <td>Insufficient permissions (e.g., admin required)</td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-info">404</span></td>
                      <td>Not Found</td>
                      <td>Resource doesn't exist or invalid endpoint</td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-warning">429</span></td>
                      <td>Too Many Requests</td>
                      <td>Rate limit exceeded, check retry-after header</td>
                    </tr>
                    <tr>
                      <td><span className="badge badge-error">500</span></td>
                      <td>Internal Server Error</td>
                      <td>Server-side error, check logs</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Select a section from the sidebar</div>;
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="sticky top-8">
              <h1 className="text-3xl font-bold mb-6">API Documentation</h1>
              <ul className="menu bg-base-200 rounded-box">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <li key={section.id}>
                      <a
                        className={activeSection === section.id ? 'active' : ''}
                        onClick={() => setActiveSection(section.id)}
                      >
                        <Icon className="h-5 w-5" />
                        {section.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiDocumentationPage;
