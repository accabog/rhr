/**
 * Mock data generators for testing.
 */

import type {
  Employee,
  Department,
  Position,
  TimeEntry,
  TimeEntryType,
  LeaveRequest,
  LeaveType,
  LeaveBalance,
  Timesheet,
  Contract,
  ContractType,
  Tenant,
  User,
  TenantMembership,
} from '@/types';

let idCounter = 1;
const nextId = () => idCounter++;

export const resetIdCounter = () => {
  idCounter = 1;
};

export const createUser = (overrides: Partial<User> = {}): User => ({
  id: nextId(),
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  ...overrides,
});

export const createTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: nextId(),
  name: 'Test Company',
  slug: 'test-company',
  is_active: true,
  plan: 'professional',
  max_employees: 100,
  ...overrides,
});

export const createTenantMembership = (
  overrides: Partial<TenantMembership> = {}
): TenantMembership => ({
  id: nextId(),
  user: createUser(),
  tenant: createTenant(),
  role: 'admin',
  is_default: true,
  ...overrides,
});

export const createDepartment = (
  overrides: Partial<Department> = {}
): Department => ({
  id: nextId(),
  name: 'Engineering',
  code: 'ENG',
  description: 'Engineering department',
  parent: null,
  manager: null,
  is_active: true,
  ...overrides,
});

export const createPosition = (
  overrides: Partial<Position> = {}
): Position => ({
  id: nextId(),
  title: 'Software Engineer',
  code: 'SWE',
  description: 'Software development role',
  department: createDepartment(),
  level: 3,
  is_active: true,
  ...overrides,
});

export const createEmployee = (
  overrides: Partial<Employee> = {}
): Employee => ({
  id: nextId(),
  employee_id: `EMP-${String(idCounter).padStart(5, '0')}`,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '555-1234',
  department: createDepartment(),
  position: createPosition(),
  manager: null,
  hire_date: '2023-01-15',
  termination_date: null,
  status: 'active',
  avatar: null,
  ...overrides,
});

export const createTimeEntryType = (
  overrides: Partial<TimeEntryType> = {}
): TimeEntryType => ({
  id: nextId(),
  name: 'Regular',
  code: 'REG',
  is_paid: true,
  multiplier: '1.00',
  color: '#3b82f6',
  is_active: true,
  ...overrides,
});

export const createTimeEntry = (
  overrides: Partial<TimeEntry> = {}
): TimeEntry => ({
  id: nextId(),
  employee: createEmployee(),
  entry_type: createTimeEntryType(),
  date: new Date().toISOString().split('T')[0],
  start_time: '09:00:00',
  end_time: '17:00:00',
  break_minutes: 60,
  notes: '',
  project: '',
  task: '',
  is_approved: false,
  approved_by: null,
  approved_at: null,
  duration_minutes: 420,
  duration_hours: 7,
  ...overrides,
});

export const createLeaveType = (
  overrides: Partial<LeaveType> = {}
): LeaveType => ({
  id: nextId(),
  name: 'Annual Leave',
  code: 'ANNUAL',
  is_paid: true,
  requires_approval: true,
  max_consecutive_days: 14,
  color: '#10b981',
  is_active: true,
  ...overrides,
});

export const createLeaveBalance = (
  overrides: Partial<LeaveBalance> = {}
): LeaveBalance => ({
  id: nextId(),
  employee: createEmployee(),
  leave_type: createLeaveType(),
  year: new Date().getFullYear(),
  entitled_days: '20.00',
  used_days: '5.00',
  carried_over: '2.00',
  remaining_days: '17.00',
  ...overrides,
});

export const createLeaveRequest = (
  overrides: Partial<LeaveRequest> = {}
): LeaveRequest => ({
  id: nextId(),
  employee: createEmployee(),
  leave_type: createLeaveType(),
  start_date: '2024-07-01',
  end_date: '2024-07-05',
  is_half_day: false,
  half_day_period: '',
  reason: 'Vacation',
  status: 'pending',
  reviewed_by: null,
  reviewed_at: null,
  review_notes: '',
  days_requested: 5,
  ...overrides,
});

export const createTimesheet = (
  overrides: Partial<Timesheet & { employee_name: string }> = {}
): Timesheet & { employee_name: string } => {
  const employee = overrides.employee ?? createEmployee();
  return {
    id: nextId(),
    employee,
    employee_name: `${employee.first_name} ${employee.last_name}`,
    period_start: '2024-01-01',
    period_end: '2024-01-14',
    status: 'draft',
    total_regular_hours: '80.00',
    total_overtime_hours: '5.00',
    total_break_hours: '10.00',
    total_hours: 85,
    submitted_at: null,
    approved_by: null,
    approved_at: null,
    rejection_reason: '',
    ...overrides,
  };
};

export const createContractType = (
  overrides: Partial<ContractType> = {}
): ContractType => ({
  id: nextId(),
  name: 'Full-time',
  code: 'FT',
  description: 'Full-time employment',
  is_active: true,
  ...overrides,
});

export const createContract = (
  overrides: Partial<Contract> = {}
): Contract => ({
  id: nextId(),
  employee: createEmployee(),
  contract_type: createContractType(),
  title: 'Employment Contract',
  start_date: '2024-01-01',
  end_date: '2025-01-01',
  status: 'active',
  salary: '60000.00',
  salary_currency: 'USD',
  salary_period: 'yearly',
  hours_per_week: '40.0',
  probation_end_date: null,
  probation_passed: true,
  notice_period_days: 30,
  notes: '',
  ...overrides,
});

export interface ContractListItem {
  id: number;
  employee: number;
  employee_name: string;
  contract_type: number;
  contract_type_name: string;
  title: string;
  start_date: string;
  end_date: string | null;
  status: 'draft' | 'active' | 'expired' | 'terminated';
  salary: string | null;
  salary_currency: string;
  salary_period: string;
  is_expiring_soon: boolean;
  created_at: string;
}

export const createContractListItem = (
  overrides: Partial<ContractListItem> = {}
): ContractListItem => ({
  id: nextId(),
  employee: 1,
  employee_name: 'John Doe',
  contract_type: 1,
  contract_type_name: 'Full-time',
  title: 'Employment Contract',
  start_date: '2024-01-01',
  end_date: '2025-01-01',
  status: 'active',
  salary: '60000.00',
  salary_currency: 'USD',
  salary_period: 'yearly',
  is_expiring_soon: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Paginated response helper
export const paginatedResponse = <T>(
  results: T[],
  count?: number
): { count: number; next: string | null; previous: string | null; results: T[] } => ({
  count: count ?? results.length,
  next: null,
  previous: null,
  results,
});

// Auth response helpers
export const createAuthResponse = (overrides: Partial<{
  access: string;
  refresh: string;
  user: User;
  tenants: TenantMembership[];
}> = {}) => ({
  access: 'mock-access-token',
  refresh: 'mock-refresh-token',
  user: createUser(),
  tenants: [createTenantMembership()],
  ...overrides,
});
