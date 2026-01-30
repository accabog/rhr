/**
 * MSW request handlers for API mocking.
 */

import { http, HttpResponse } from 'msw';
import {
  createAuthResponse,
  createEmployee,
  createTimeEntry,
  createTimeEntryType,
  createLeaveRequest,
  createLeaveType,
  createLeaveBalance,
  createTimesheet,
  createContract,
  createContractType,
  createDepartment,
  createPosition,
  paginatedResponse,
} from './data';

const API_URL = '/api/v1';

// Default mock data
const mockEmployee = createEmployee();
const mockTimeEntryType = createTimeEntryType();
const mockTimeEntry = createTimeEntry({ employee: mockEmployee, entry_type: mockTimeEntryType });
const mockLeaveType = createLeaveType();
const mockLeaveBalance = createLeaveBalance();
const mockLeaveRequest = createLeaveRequest();
const mockTimesheet = createTimesheet({ employee: mockEmployee });
const mockContractType = createContractType();
const mockContract = createContract({ employee: mockEmployee, contract_type: mockContractType });
const mockDepartment = createDepartment();
const mockPosition = createPosition({ department: mockDepartment });

export const handlers = [
  // ==================== Auth ====================
  http.post(`${API_URL}/auth/login/`, async () => {
    return HttpResponse.json(createAuthResponse());
  }),

  http.post(`${API_URL}/auth/register/`, async () => {
    return HttpResponse.json(createAuthResponse());
  }),

  http.post(`${API_URL}/auth/refresh/`, async () => {
    return HttpResponse.json({
      access: 'new-mock-access-token',
      refresh: 'new-mock-refresh-token',
    });
  }),

  http.post(`${API_URL}/auth/logout/`, async () => {
    return HttpResponse.json({ detail: 'Successfully logged out' });
  }),

  http.get(`${API_URL}/auth/me/`, async () => {
    return HttpResponse.json(createAuthResponse().user);
  }),

  // ==================== Employees ====================
  http.get(`${API_URL}/employees/`, async () => {
    return HttpResponse.json(paginatedResponse([mockEmployee]));
  }),

  http.get(`${API_URL}/employees/:id/`, async ({ params }) => {
    return HttpResponse.json({ ...mockEmployee, id: Number(params.id) });
  }),

  http.post(`${API_URL}/employees/`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { ...mockEmployee, ...body, id: 100 },
      { status: 201 }
    );
  }),

  http.put(`${API_URL}/employees/:id/`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockEmployee, ...body, id: Number(params.id) });
  }),

  http.patch(`${API_URL}/employees/:id/`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockEmployee, ...body, id: Number(params.id) });
  }),

  http.delete(`${API_URL}/employees/:id/`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_URL}/employees/me/`, async () => {
    return HttpResponse.json(mockEmployee);
  }),

  // ==================== Departments ====================
  http.get(`${API_URL}/departments/`, async () => {
    return HttpResponse.json(paginatedResponse([mockDepartment]));
  }),

  http.post(`${API_URL}/departments/`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { ...mockDepartment, ...body, id: 100 },
      { status: 201 }
    );
  }),

  // ==================== Positions ====================
  http.get(`${API_URL}/positions/`, async () => {
    return HttpResponse.json(paginatedResponse([mockPosition]));
  }),

  // ==================== Time Tracking ====================
  http.get(`${API_URL}/time-entries/`, async () => {
    return HttpResponse.json(paginatedResponse([mockTimeEntry]));
  }),

  http.get(`${API_URL}/time-entries/my_entries/`, async () => {
    return HttpResponse.json(paginatedResponse([mockTimeEntry]));
  }),

  http.get(`${API_URL}/time-entries/current/`, async () => {
    return HttpResponse.json(null);
  }),

  http.post(`${API_URL}/time-entries/clock_in/`, async () => {
    const activeEntry = createTimeEntry({
      end_time: null,
      break_minutes: 0,
    });
    return HttpResponse.json(activeEntry, { status: 201 });
  }),

  http.post(`${API_URL}/time-entries/clock_out/`, async () => {
    return HttpResponse.json(mockTimeEntry);
  }),

  http.get(`${API_URL}/time-entries/summary/`, async () => {
    return HttpResponse.json({
      week_start: '2024-01-01',
      week_end: '2024-01-07',
      total_hours: '40.00',
      regular_hours: '35.00',
      overtime_hours: '5.00',
      daily_breakdown: [],
    });
  }),

  http.post(`${API_URL}/time-entries/:id/approve/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockTimeEntry,
      id: Number(params.id),
      is_approved: true,
    });
  }),

  http.post(`${API_URL}/time-entries/`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { ...mockTimeEntry, ...body, id: 100 },
      { status: 201 }
    );
  }),

  http.patch(`${API_URL}/time-entries/:id/`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockTimeEntry, ...body, id: Number(params.id) });
  }),

  http.delete(`${API_URL}/time-entries/:id/`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${API_URL}/time-entries/types/`, async () => {
    return HttpResponse.json([mockTimeEntryType]);
  }),

  http.get(`${API_URL}/time-entry-types/`, async () => {
    return HttpResponse.json([mockTimeEntryType]);
  }),

  // ==================== Leave ====================
  // Legacy paths (leave-types, leave-balances, leave-requests)
  http.get(`${API_URL}/leave-types/`, async () => {
    return HttpResponse.json([mockLeaveType]);
  }),

  http.get(`${API_URL}/leave-balances/`, async () => {
    return HttpResponse.json(paginatedResponse([mockLeaveBalance]));
  }),

  http.get(`${API_URL}/leave-balances/my_balances/`, async () => {
    return HttpResponse.json([mockLeaveBalance]);
  }),

  http.get(`${API_URL}/leave-balances/summary/`, async () => {
    return HttpResponse.json([
      {
        leave_type_id: 1,
        leave_type_name: 'Annual Leave',
        leave_type_color: '#10b981',
        entitled_days: '20.00',
        used_days: '5.00',
        remaining_days: '17.00',
        pending_days: '0.00',
      },
    ]);
  }),

  http.get(`${API_URL}/leave-requests/`, async () => {
    return HttpResponse.json(paginatedResponse([mockLeaveRequest]));
  }),

  http.get(`${API_URL}/leave-requests/my_requests/`, async () => {
    return HttpResponse.json(paginatedResponse([mockLeaveRequest]));
  }),

  http.get(`${API_URL}/leave-requests/pending_approval/`, async () => {
    return HttpResponse.json(paginatedResponse([mockLeaveRequest]));
  }),

  http.post(`${API_URL}/leave-requests/`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { ...mockLeaveRequest, ...body, id: 100 },
      { status: 201 }
    );
  }),

  http.post(`${API_URL}/leave-requests/:id/approve/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockLeaveRequest,
      id: Number(params.id),
      status: 'approved',
    });
  }),

  http.post(`${API_URL}/leave-requests/:id/reject/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockLeaveRequest,
      id: Number(params.id),
      status: 'rejected',
    });
  }),

  http.post(`${API_URL}/leave-requests/:id/cancel/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockLeaveRequest,
      id: Number(params.id),
      status: 'cancelled',
    });
  }),

  http.get(`${API_URL}/leave-requests/calendar/`, async () => {
    return HttpResponse.json([mockLeaveRequest]);
  }),

  http.get(`${API_URL}/holidays/`, async () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_URL}/holidays/upcoming/`, async () => {
    return HttpResponse.json([]);
  }),

  // New paths (leave/types, leave/balances, leave/requests)
  http.get(`${API_URL}/leave/types/`, async () => {
    return HttpResponse.json([mockLeaveType]);
  }),

  http.get(`${API_URL}/leave/balances/`, async () => {
    return HttpResponse.json(paginatedResponse([mockLeaveBalance]));
  }),

  http.get(`${API_URL}/leave/balances/my_balances/`, async () => {
    return HttpResponse.json([mockLeaveBalance]);
  }),

  http.get(`${API_URL}/leave/balances/summary/`, async () => {
    return HttpResponse.json([
      {
        leave_type_id: 1,
        leave_type_name: 'Annual Leave',
        leave_type_color: '#10b981',
        entitled_days: '20.00',
        used_days: '5.00',
        remaining_days: '17.00',
        pending_days: '0.00',
      },
    ]);
  }),

  http.get(`${API_URL}/leave/requests/`, async () => {
    return HttpResponse.json(paginatedResponse([mockLeaveRequest]));
  }),

  http.get(`${API_URL}/leave/requests/my_requests/`, async () => {
    return HttpResponse.json(paginatedResponse([mockLeaveRequest]));
  }),

  http.get(`${API_URL}/leave/requests/pending_approval/`, async () => {
    return HttpResponse.json(paginatedResponse([mockLeaveRequest]));
  }),

  http.post(`${API_URL}/leave/requests/`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json(
      { ...mockLeaveRequest, ...body, id: 100 },
      { status: 201 }
    );
  }),

  http.post(`${API_URL}/leave/requests/:id/approve/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockLeaveRequest,
      id: Number(params.id),
      status: 'approved',
    });
  }),

  http.post(`${API_URL}/leave/requests/:id/reject/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockLeaveRequest,
      id: Number(params.id),
      status: 'rejected',
    });
  }),

  http.post(`${API_URL}/leave/requests/:id/cancel/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockLeaveRequest,
      id: Number(params.id),
      status: 'cancelled',
    });
  }),

  http.get(`${API_URL}/leave/requests/calendar/`, async () => {
    return HttpResponse.json([mockLeaveRequest]);
  }),

  http.get(`${API_URL}/leave/holidays/`, async () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_URL}/leave/holidays/upcoming/`, async () => {
    return HttpResponse.json([]);
  }),

  // ==================== Timesheets ====================
  http.get(`${API_URL}/timesheets/`, async () => {
    return HttpResponse.json(paginatedResponse([mockTimesheet]));
  }),

  http.get(`${API_URL}/timesheets/:id/`, async ({ params }) => {
    return HttpResponse.json({ ...mockTimesheet, id: Number(params.id) });
  }),

  http.get(`${API_URL}/timesheets/my_timesheets/`, async () => {
    return HttpResponse.json(paginatedResponse([mockTimesheet]));
  }),

  http.get(`${API_URL}/timesheets/pending_approval/`, async () => {
    return HttpResponse.json(
      paginatedResponse([{ ...mockTimesheet, status: 'submitted', total_hours: 85 }])
    );
  }),

  http.post(`${API_URL}/timesheets/generate/`, async () => {
    return HttpResponse.json(mockTimesheet, { status: 201 });
  }),

  http.post(`${API_URL}/timesheets/:id/submit/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockTimesheet,
      id: Number(params.id),
      status: 'submitted',
    });
  }),

  http.post(`${API_URL}/timesheets/:id/approve/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockTimesheet,
      id: Number(params.id),
      status: 'approved',
    });
  }),

  http.post(`${API_URL}/timesheets/:id/reject/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockTimesheet,
      id: Number(params.id),
      status: 'rejected',
    });
  }),

  http.post(`${API_URL}/timesheets/:id/reopen/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockTimesheet,
      id: Number(params.id),
      status: 'draft',
    });
  }),

  // ==================== Contracts ====================
  http.get(`${API_URL}/contract-types/`, async () => {
    return HttpResponse.json([mockContractType]);
  }),

  http.get(`${API_URL}/contracts/`, async () => {
    return HttpResponse.json(paginatedResponse([mockContract]));
  }),

  http.get(`${API_URL}/contracts/:id/`, async ({ params }) => {
    return HttpResponse.json({ ...mockContract, id: Number(params.id) });
  }),

  http.get(`${API_URL}/contracts/my_contracts/`, async () => {
    return HttpResponse.json(paginatedResponse([mockContract]));
  }),

  http.get(`${API_URL}/contracts/expiring/`, async () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_URL}/contracts/stats/`, async () => {
    return HttpResponse.json({
      total: 10,
      active: 8,
      draft: 1,
      expired: 1,
      expiring_soon: 2,
    });
  }),

  http.post(`${API_URL}/contracts/:id/activate/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockContract,
      id: Number(params.id),
      status: 'active',
    });
  }),

  http.post(`${API_URL}/contracts/:id/terminate/`, async ({ params }) => {
    return HttpResponse.json({
      ...mockContract,
      id: Number(params.id),
      status: 'terminated',
    });
  }),

  // ==================== Dashboard ====================
  http.get(`${API_URL}/dashboard/stats/`, async () => {
    return HttpResponse.json({
      total_employees: 50,
      active_employees: 45,
      pending_leave_requests: 3,
      pending_timesheets: 5,
    });
  }),

  // ==================== Tenants ====================
  http.get(`${API_URL}/tenants/`, async () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_URL}/tenants/current/`, async () => {
    return HttpResponse.json({
      id: 1,
      name: 'Test Company',
      slug: 'test-company',
    });
  }),
];

// Error handlers for testing error scenarios
export const errorHandlers = {
  unauthorized: http.get(`${API_URL}/employees/`, async () => {
    return HttpResponse.json(
      { detail: 'Authentication credentials were not provided.' },
      { status: 401 }
    );
  }),

  serverError: http.get(`${API_URL}/employees/`, async () => {
    return HttpResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }),

  validationError: http.post(`${API_URL}/employees/`, async () => {
    return HttpResponse.json(
      { email: ['This field is required.'] },
      { status: 400 }
    );
  }),
};
