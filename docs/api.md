# API Reference

This document provides an overview of the Raptor HR REST API.

## Base URL

```
Development: http://localhost:8000/api/v1/
Production:  https://your-domain.com/api/v1/
```

## Interactive Documentation

Interactive API documentation is available at:

- **Swagger UI**: `/api/docs/`

## Authentication

Raptor HR uses JWT (JSON Web Tokens) for authentication.

### Obtain Tokens

```http
POST /api/v1/auth/login/
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access": "<access-token>",
  "refresh": "<refresh-token>",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Token Lifetimes

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access | 15 minutes | API requests |
| Refresh | 7 days | Obtain new access tokens |

### Using Tokens

Include the access token in the `Authorization` header:

```http
GET /api/v1/employees/
Authorization: Bearer <access-token>
```

### Refresh Token

```http
POST /api/v1/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "<refresh-token>"
}
```

**Response:**
```json
{
  "access": "<access-token>"
}
```

## Multi-Tenancy

All tenant-scoped endpoints require the `X-Tenant-ID` header:

```http
GET /api/v1/employees/
Authorization: Bearer <token>
X-Tenant-ID: acme-corp
```

Alternatively, tenant can be resolved from the subdomain (e.g., `acme-corp.app.rhr.com`).

## Request/Response Format

### Content Type

All requests and responses use JSON:

```http
Content-Type: application/json
Accept: application/json
```

### Standard Response Format

**Success (single object):**
```json
{
  "id": 1,
  "email": "employee@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Success (list with pagination):**
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/v1/employees/?cursor=abc123",
  "previous": null,
  "results": [
    { "id": 1, "first_name": "John", ... },
    { "id": 2, "first_name": "Jane", ... }
  ]
}
```

**Error:**
```json
{
  "detail": "Authentication credentials were not provided."
}
```

**Validation Error:**
```json
{
  "email": ["This field is required."],
  "hire_date": ["Date has wrong format."]
}
```

## Pagination

The API uses cursor-based pagination for large datasets:

```http
GET /api/v1/employees/?cursor=abc123&page_size=20
```

| Parameter | Description | Default |
|-----------|-------------|---------|
| `cursor` | Cursor for next/previous page | - |
| `page_size` | Number of results per page | 20 |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login/` | Obtain access and refresh tokens |
| POST | `/auth/register/` | Register new user |
| POST | `/auth/token/refresh/` | Refresh access token |
| POST | `/auth/logout/` | Invalidate refresh token |
| GET | `/auth/me/` | Get current user info |
| PATCH | `/auth/me/` | Update current user profile |
| POST | `/auth/me/avatar/` | Upload user avatar |
| DELETE | `/auth/me/avatar/` | Remove user avatar |
| POST | `/auth/change-password/` | Change user password |

### Tenants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tenants/` | List user's tenants |
| GET | `/tenants/{slug}/` | Get tenant details |
| POST | `/tenants/` | Create new tenant |
| PUT | `/tenants/{slug}/` | Update tenant |
| POST | `/tenants/{slug}/logo/` | Upload tenant logo |
| DELETE | `/tenants/{slug}/logo/` | Remove tenant logo |
| POST | `/tenants/{slug}/logo-icon/` | Upload tenant icon |
| DELETE | `/tenants/{slug}/logo-icon/` | Remove tenant icon |

### Employees

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/employees/` | List employees |
| POST | `/employees/` | Create employee |
| GET | `/employees/{id}/` | Get employee details |
| PUT | `/employees/{id}/` | Update employee |
| DELETE | `/employees/{id}/` | Delete employee |

### Departments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments/` | List departments |
| POST | `/departments/` | Create department |
| GET | `/departments/{id}/` | Get department details |
| PUT | `/departments/{id}/` | Update department |
| DELETE | `/departments/{id}/` | Delete department |

### Positions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/positions/` | List positions |
| POST | `/positions/` | Create position |
| GET | `/positions/{id}/` | Get position details |
| PUT | `/positions/{id}/` | Update position |
| DELETE | `/positions/{id}/` | Delete position |

### Time Tracking

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/time-entries/` | List time entries |
| POST | `/time-entries/` | Create time entry |
| GET | `/time-entries/{id}/` | Get time entry details |
| PUT | `/time-entries/{id}/` | Update time entry |
| DELETE | `/time-entries/{id}/` | Delete time entry |
| POST | `/time-entries/{id}/approve/` | Approve time entry |

### Timesheets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/timesheets/` | List timesheets |
| POST | `/timesheets/` | Create timesheet |
| GET | `/timesheets/{id}/` | Get timesheet details |
| PUT | `/timesheets/{id}/` | Update timesheet |
| POST | `/timesheets/{id}/submit/` | Submit for approval |
| POST | `/timesheets/{id}/approve/` | Approve timesheet |
| POST | `/timesheets/{id}/reject/` | Reject timesheet |

### Leave Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/leave/types/` | List leave types |
| GET | `/leave/balances/` | List leave balances |
| GET | `/leave/requests/` | List leave requests |
| POST | `/leave/requests/` | Create leave request |
| GET | `/leave/requests/{id}/` | Get leave request details |
| POST | `/leave/requests/{id}/approve/` | Approve request |
| POST | `/leave/requests/{id}/reject/` | Reject request |
| POST | `/leave/requests/{id}/cancel/` | Cancel request |
| GET | `/leave/holidays/` | List holidays |
| POST | `/leave/holidays/sync/` | Sync national holidays from Nager.Date |
| GET | `/leave/holidays/upcoming/` | List upcoming holidays |

### Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contracts/` | List contracts |
| POST | `/contracts/` | Create contract |
| GET | `/contracts/{id}/` | Get contract details |
| PUT | `/contracts/{id}/` | Update contract |
| DELETE | `/contracts/{id}/` | Delete contract |
| GET | `/contracts/types/` | List contract types |

### Documents

Documents use polymorphic relations and can be attached to any entity (Employee, LeaveRequest, Contract, etc.).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents/` | List documents (filterable by entity) |
| POST | `/documents/` | Upload a document |
| GET | `/documents/{id}/` | Get document details |
| DELETE | `/documents/{id}/` | Delete a document |
| GET | `/documents/{id}/download/` | Download document file |

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Rate Limiting

API requests are rate-limited:

| Tier | Limit |
|------|-------|
| Authenticated | 1000 requests/hour |
| Unauthenticated | 100 requests/hour |

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642694400
```

## Examples

### Create an Employee

```bash
curl -X POST http://localhost:8000/api/v1/employees/ \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: acme-corp" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP001",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@acme.com",
    "hire_date": "2024-01-15",
    "department": 1,
    "position": 1
  }'
```

### Submit a Leave Request

```bash
curl -X POST http://localhost:8000/api/v1/leave/requests/ \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: acme-corp" \
  -H "Content-Type: application/json" \
  -d '{
    "leave_type": 1,
    "start_date": "2024-02-01",
    "end_date": "2024-02-05",
    "reason": "Family vacation"
  }'
```

### Create a Time Entry

```bash
curl -X POST http://localhost:8000/api/v1/time-entries/ \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: acme-corp" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-01-15",
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "break_minutes": 60,
    "entry_type": 1,
    "notes": "Regular workday"
  }'
```

### Upload a Document

```bash
curl -X POST http://localhost:8000/api/v1/documents/ \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: acme-corp" \
  -F "file=@/path/to/document.pdf" \
  -F "name=Employment Contract" \
  -F "description=Signed employment contract" \
  -F "content_type_model=employee" \
  -F "object_id=1"
```

### Upload Tenant Logo

```bash
curl -X POST http://localhost:8000/api/v1/tenants/acme-corp/logo/ \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: acme-corp" \
  -F "logo=@/path/to/logo.png"
```

### Sync National Holidays

```bash
curl -X POST http://localhost:8000/api/v1/leave/holidays/sync/ \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: acme-corp" \
  -H "Content-Type: application/json" \
  -d '{
    "country": "US"
  }'
```

### Update User Profile

```bash
curl -X PATCH http://localhost:8000/api/v1/auth/me/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Smith"
  }'
```
