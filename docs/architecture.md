# System Architecture

This document describes the high-level architecture of Raptor HR.

## System Overview

```mermaid
graph TB
    subgraph Client
        Browser[Web Browser]
    end

    subgraph Frontend["Frontend (React)"]
        React[React App]
        TanStack[TanStack Query]
        Zustand[Zustand Store]
    end

    subgraph Backend["Backend (Django)"]
        DRF[Django REST Framework]
        Middleware[Tenant Middleware]
        Celery[Celery Workers]
    end

    subgraph Data["Data Layer"]
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis)]
    end

    Browser --> React
    React --> TanStack
    React --> Zustand
    TanStack --> DRF
    DRF --> Middleware
    Middleware --> PostgreSQL
    DRF --> Redis
    Celery --> Redis
    Celery --> PostgreSQL
```

## Component Responsibilities

### Frontend (React + TypeScript)

| Component | Responsibility |
|-----------|----------------|
| **React** | UI rendering and component lifecycle |
| **TanStack Query** | Server state management, caching, background updates |
| **Zustand** | Client-side state (auth, UI preferences) |
| **React Router** | Client-side routing |
| **Ant Design** | UI component library |

### Backend (Django REST Framework)

| Component | Responsibility |
|-----------|----------------|
| **DRF ViewSets** | API endpoints and request handling |
| **Tenant Middleware** | Multi-tenant request isolation |
| **SimpleJWT** | JWT token authentication |
| **Celery** | Async task processing |

### Data Layer

| Component | Responsibility |
|-----------|----------------|
| **PostgreSQL** | Primary data storage |
| **Redis** | Session cache, Celery message broker |
| **File Storage** | Media files (logos, avatars, documents) |

## Request Flow

```mermaid
sequenceDiagram
    participant Browser
    participant React
    participant DRF
    participant Middleware
    participant Database

    Browser->>React: User action
    React->>DRF: API request + JWT + X-Tenant-ID
    DRF->>Middleware: Validate token
    Middleware->>Middleware: Resolve tenant
    Middleware->>Database: Tenant-scoped query
    Database-->>DRF: Results
    DRF-->>React: JSON response
    React-->>Browser: Update UI
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Enter credentials
    Frontend->>Backend: POST /api/v1/auth/login/
    Backend->>Database: Validate user
    Database-->>Backend: User data
    Backend-->>Frontend: Access + Refresh tokens
    Frontend->>Frontend: Store tokens

    Note over Frontend,Backend: Subsequent requests

    Frontend->>Backend: Request + Bearer token
    Backend->>Backend: Validate JWT
    Backend-->>Frontend: Protected resource

    Note over Frontend,Backend: Token refresh

    Frontend->>Backend: POST /api/v1/auth/token/refresh/
    Backend-->>Frontend: New access token
```

## Multi-Tenancy Architecture

See [Multi-Tenancy](./multi-tenancy.md) for detailed documentation.

```mermaid
graph TB
    subgraph Request
        R[Incoming Request]
    end

    subgraph Middleware
        TM[TenantMiddleware]
        TM --> H{X-Tenant-ID Header?}
        H -->|Yes| RT[Resolve by ID]
        H -->|No| SD[Check Subdomain]
        SD --> RT2[Resolve by Domain]
    end

    subgraph ViewSet
        VS[TenantAwareViewSet]
        QS[get_queryset]
        QS --> FT[.for_tenant]
    end

    R --> TM
    RT --> VS
    RT2 --> VS
    VS --> QS
```

## Deployment Architecture

```mermaid
graph TB
    subgraph Internet
        DNS[DNS]
        LB[Load Balancer]
    end

    subgraph Application
        Nginx[Nginx]
        Frontend[Frontend Container]
        Backend[Backend Container]
        Celery[Celery Workers]
    end

    subgraph Data
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis)]
    end

    DNS --> LB
    LB --> Nginx
    Nginx --> Frontend
    Nginx --> Backend
    Backend --> PostgreSQL
    Backend --> Redis
    Celery --> PostgreSQL
    Celery --> Redis
```

## External Integrations

### Nager.Date API (National Holidays)

The platform integrates with [Nager.Date](https://date.nager.at/) to sync national holidays.

```mermaid
sequenceDiagram
    participant Admin
    participant Backend
    participant NagerAPI as Nager.Date API
    participant Database

    Admin->>Backend: POST /holidays/sync/ {country: "US"}
    Backend->>NagerAPI: GET /api/v3/PublicHolidays/2025/US
    NagerAPI-->>Backend: Holiday data (JSON)
    Backend->>Database: Upsert holidays
    Database-->>Backend: Created/Updated counts
    Backend-->>Admin: {created: 12, updated: 0}
```

**Sync Methods:**
- **API Endpoint**: `POST /api/v1/holidays/sync/` (admin-only)
- **Management Command**: `python manage.py sync_holidays`

**Data Stored:**
- Holiday name (English and local)
- Date and country code
- Holiday types (Public, Bank, National, etc.)
- Source tracking (`nager_date` vs `manual`)

## CI/CD Pipeline

```mermaid
graph LR
    subgraph Trigger
        Push[Push/PR]
    end

    subgraph CI["CI (GitHub Actions)"]
        Lint[Lint]
        TypeCheck[Type Check]
        Test[Tests]
        Coverage[Codecov]
        Build[Docker Build]
    end

    subgraph CD["CD"]
        Staging[Deploy Staging]
        Prod[Deploy Production]
    end

    Push --> Lint
    Lint --> TypeCheck
    TypeCheck --> Test
    Test --> Coverage
    Coverage --> Build
    Build --> Staging
    Staging -->|Manual Approval| Prod
```

## Technology Decisions

### Why Django REST Framework?
- Mature ecosystem with excellent documentation
- Built-in support for authentication, permissions, serialization
- Strong typing support via django-stubs
- Excellent ORM for complex queries

### Why React + TypeScript?
- Component-based architecture scales well
- TypeScript catches errors at compile time
- Large ecosystem of libraries and tools
- TanStack Query simplifies server state management

### Why PostgreSQL?
- ACID compliance for financial/HR data
- Excellent JSON support for flexible schemas
- Strong indexing capabilities
- Battle-tested reliability

### Why Redis?
- Fast in-memory caching
- Native support as Celery broker
- Session storage capabilities
- Pub/sub for real-time features (future)
