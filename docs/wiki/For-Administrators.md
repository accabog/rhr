# For Administrators

This guide covers system configuration and management tasks for tenant administrators.

## User Management

### Inviting Users

1. Go to **Settings > Users**
2. Click **Invite User**
3. Enter their email address
4. Assign a role (Employee, Manager, Admin)
5. Send invitation

The user will receive an email to set their password and log in.

### Managing Roles

| Role | Permissions |
|------|-------------|
| Employee | View own data, submit requests and time |
| Manager | Employee permissions + approve team requests |
| Admin | Full access to all settings and data |

### Deactivating Users

When an employee leaves:
1. Go to **Settings > Users**
2. Find the user
3. Click **Deactivate**

Deactivated users cannot log in but their historical data is preserved.

## Organization Setup

### Departments

1. Go to **Organization > Departments**
2. Click **Add Department**
3. Enter name and optional parent department
4. Save

Departments can be nested to reflect your org structure.

### Positions

1. Go to **Organization > Positions**
2. Click **Add Position**
3. Enter title and department
4. Save

Positions are assigned to employees and used for reporting.

## Leave Configuration

### Leave Types

Configure the types of leave available:

1. Go to **Settings > Leave Types**
2. Click **Add Type** or edit existing
3. Configure:
   - **Name** - e.g., "Annual Leave", "Sick Leave"
   - **Accrual** - How balances accumulate
   - **Default Balance** - Starting allocation
   - **Requires Approval** - Whether manager approval needed
4. Save

### Holidays

Set up company holidays:

1. Go to **Settings > Holidays**
2. Click **Add Holiday**
3. Enter name and date
4. Choose if it's a full or half day
5. Save

Holidays appear on the calendar and may affect leave calculations.

## Time Tracking Settings

### Entry Types

1. Go to **Settings > Time Entry Types**
2. Add or edit types (Regular, Overtime, On-Call, etc.)
3. Configure billing/pay rate multipliers if applicable

### Timesheet Periods

Configure how timesheets are grouped:
- Weekly (Monday-Sunday or Sunday-Saturday)
- Bi-weekly
- Monthly

## Contracts

### Contract Types

1. Go to **Settings > Contract Types**
2. Add types: Full-time, Part-time, Contractor, etc.
3. Configure default settings for each type

### Managing Contracts

1. Go to **Employees > [Employee] > Contracts**
2. Add or update contract information
3. Upload contract documents
4. Set start/end dates and renewal reminders

## Data Export

Export data for reporting:
1. Go to **Settings > Export**
2. Select data type (Employees, Leave, Time, etc.)
3. Choose date range and format (CSV, Excel)
4. Download

## Audit Trail

View system activity:
1. Go to **Settings > Audit Log**
2. Filter by date, user, or action type
3. Review changes made to records

The audit log tracks who made changes and when.
