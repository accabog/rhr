# Changelog

All notable changes to Raptor HR will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Nothing yet

### Changed
- Upgraded Ant Design from v5 to v6
- Updated GitHub Actions: codecov-action v4→v5, codeql-action v3→v4, cache v4→v5, setup-uv v4→v7, github-script v7→v8
- Updated Python dependencies: django, redis, gunicorn, cryptography, pillow, pytest, and others
- Updated npm dependencies (23 packages)

### Fixed
- Fixed component props for antd v6 compatibility (Space direction→orientation, Progress trailColor→railColor, Statistic valueStyle→styles.content, Divider orientation→titlePlacement)
- Fixed API URL construction to avoid trailing `?` when no query parameters

## [0.1.1] - 2024-01-30

### Fixed
- E2E test strict mode violation for registration validation
- Resolved mypy type errors in backend
- Added DashboardPage tests for frontend
- Fixed import of `Callable` from `collections.abc` for Python 3.12 compatibility
- Corrected E2E registration validation test assertions

## [0.1.0] - 2024-01-15

### Added

#### Core Platform
- Multi-tenant architecture with complete data isolation
- JWT-based authentication with token refresh
- Role-based access control (Owner, Admin, Manager, Employee, Viewer)
- Custom User model with email-based login

#### Employee Management
- Employee records with personal and employment details
- Department hierarchy with parent-child relationships
- Position management with seniority levels
- Manager-employee relationships

#### Time Tracking
- Time entry creation with start/end times
- Configurable time entry types (regular, overtime, etc.)
- Break tracking
- Project and task assignment
- Approval workflow for time entries

#### Timesheets
- Period-based timesheet generation
- Automatic calculation of regular and overtime hours
- Multi-step approval workflow (draft → submitted → approved/rejected)
- Comments on timesheets during review

#### Leave Management
- Configurable leave types (vacation, sick, personal, etc.)
- Leave balance tracking per employee per year
- Leave request workflow with approval
- Half-day leave support
- Holiday calendar with department-specific holidays

#### Contracts
- Employment contract management
- Configurable contract types
- Salary and compensation tracking
- Probation period tracking
- Document attachments

#### Frontend
- React 18 with TypeScript
- Ant Design component library
- TanStack Query for server state
- Zustand for client state
- Feature-based architecture

#### Infrastructure
- Docker and Docker Compose setup
- GitHub Actions CI/CD pipeline
- Backend and frontend test coverage gates
- E2E testing with Playwright
- CodeQL security scanning

### Security
- JWT token expiration and rotation
- Tenant data isolation
- Rate limiting on API endpoints
- CORS configuration

---

[Unreleased]: https://github.com/your-org/rhr/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/your-org/rhr/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/your-org/rhr/releases/tag/v0.1.0
