# RHR Domain Knowledge

## Business Context

Raptor HR (RHR) is a multi-tenant HR platform. Each tenant represents a company/organization that uses the platform to manage their employees, time tracking, leave requests, and employment contracts.

## Core Business Entities

### Tenant
- A company or organization using the platform
- Has a unique subdomain (e.g., `acme.raptorhr.com`)
- Contains all organizational data (employees, departments, etc.)
- Has settings that customize behavior per organization

### User
- Login credentials for accessing the platform
- Can exist independently of an employee record
- Has roles: `admin`, `manager`, `employee`
- Belongs to one or more tenants

### Employee
- A person working at a tenant organization
- May or may not have a User account (some employees don't need login)
- Has personal info, employment details, and organizational placement
- Self-referential `manager` relationship

### Department
- Organizational unit with hierarchy
- Has optional parent department for org chart
- Has a manager (Employee) responsible for the department

### Position
- Job title/role within the organization
- Used for standardizing roles across employees

## HR Domain Entities

### Leave Management
- **LeaveType**: Categories of leave (vacation, sick, personal, etc.)
- **LeaveRequest**: Employee request for time off
- **LeaveBalance**: Tracking of available leave days per type

### Time Tracking
- **TimeEntry**: Clock in/out records for employees
- **TimeEntryType**: Categories of time (regular, overtime, etc.)

### Timesheets
- **Timesheet**: Period summary (weekly/monthly) of time entries
- Has approval workflow (draft → submitted → approved/rejected)

### Contracts
- **Contract**: Employment agreement with terms
- Has status (active, expired, terminated)
- Contains salary, start/end dates, employment type

## Entity Relationships

```
Tenant
├── User (login accounts)
├── Department (organizational structure)
│   └── Department (children/hierarchy)
├── Position (job titles)
├── Employee (workforce)
│   ├── → Department
│   ├── → Position
│   ├── → User (optional login)
│   ├── → Employee (manager)
│   ├── LeaveRequest
│   ├── TimeEntry
│   ├── Timesheet
│   └── Contract
├── LeaveType (leave categories)
└── TimeEntryType (time categories)
```

## Business Rules

### Tenant Isolation
- ALL data is scoped to a tenant
- Users can only see data from their current tenant
- Cross-tenant data access is prevented at the database level

### Manager Hierarchy
- Employees can have a manager (another Employee)
- Managers can approve leave requests for their reports
- Org chart is built from manager relationships

### Leave Workflow
1. Employee creates LeaveRequest
2. Manager receives notification
3. Manager approves/rejects
4. Leave balance is updated (if approved)

### Timesheet Workflow
1. Time entries accumulate during period
2. Employee submits timesheet for approval
3. Manager reviews and approves/rejects
4. Approved timesheets feed into payroll (external)

## Terminology

| Term | Definition |
|------|------------|
| Tenant | A company using the platform |
| Member | A user belonging to a tenant |
| Admin | User with full tenant management access |
| Manager | Employee with reports who can approve requests |
| PTO | Paid Time Off (synonym for leave) |
