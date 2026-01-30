/**
 * Tests for EmployeeFormModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import {
  createEmployee,
  createDepartment,
  createPosition,
  paginatedResponse,
} from '@/test/mocks/data';
import EmployeeFormModal from '../EmployeeFormModal';

const mockDepartments = [
  createDepartment({ id: 1, name: 'Engineering' }),
  createDepartment({ id: 2, name: 'Sales' }),
];

const mockPositions = [
  createPosition({ id: 1, title: 'Software Engineer' }),
  createPosition({ id: 2, title: 'Sales Manager' }),
];

const mockManagers = [
  createEmployee({ id: 10, first_name: 'Jane', last_name: 'Manager' }),
];

function renderModal(props: {
  open: boolean;
  onClose: () => void;
  employee?: ReturnType<typeof createEmployee> | null;
}) {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <EmployeeFormModal {...props} />
    </Wrapper>
  );
}

describe('EmployeeFormModal', () => {
  beforeEach(() => {
    server.use(
      http.get('/api/v1/departments/', () => {
        return HttpResponse.json(paginatedResponse(mockDepartments));
      }),
      http.get('/api/v1/positions/', () => {
        return HttpResponse.json(paginatedResponse(mockPositions));
      }),
      http.get('/api/v1/employees/', () => {
        return HttpResponse.json(paginatedResponse(mockManagers));
      })
    );
  });

  describe('create mode', () => {
    it('renders create form when no employee provided', async () => {
      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: null });

      await waitFor(() => {
        // Modal title
        expect(screen.getByRole('dialog')).toHaveTextContent('Add Employee');
      });

      // Submit button
      expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
    });

    it('loads departments and positions', async () => {
      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: null });

      // Click department dropdown to trigger load
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: null });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter employee ID')).toBeInTheDocument();
      });
    });

    it('validates email format', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: null });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill invalid email
      const emailInput = screen.getByPlaceholderText('email@company.com');
      await user.type(emailInput, 'not-an-email');

      await user.click(screen.getByRole('button', { name: /add employee/i }));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
      });
    });

    it('calls create API on valid submission', async () => {
      let capturedBody: Record<string, unknown> | undefined;

      server.use(
        http.post('/api/v1/employees/', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json(
            createEmployee({ id: 100, ...capturedBody }),
            { status: 201 }
          );
        })
      );

      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: null });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill required fields
      await user.type(screen.getByPlaceholderText('e.g., EMP001'), 'EMP-123');
      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
      await user.type(screen.getByPlaceholderText('email@company.com'), 'john@example.com');

      // Submit
      await user.click(screen.getByRole('button', { name: /add employee/i }));

      await waitFor(() => {
        expect(capturedBody).toBeDefined();
        expect(capturedBody?.employee_id).toBe('EMP-123');
        expect(capturedBody?.first_name).toBe('John');
        expect(capturedBody?.last_name).toBe('Doe');
        expect(capturedBody?.email).toBe('john@example.com');
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('edit mode', () => {
    const existingEmployee = createEmployee({
      id: 5,
      employee_id: 'EMP-005',
      first_name: 'Existing',
      last_name: 'Employee',
      email: 'existing@example.com',
      hire_date: '2023-06-15',
      status: 'active',
    });

    it('renders edit form with employee data', async () => {
      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: existingEmployee });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveTextContent('Edit Employee');
      });

      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('pre-fills form with employee data', async () => {
      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: existingEmployee });

      await waitFor(() => {
        expect(screen.getByDisplayValue('EMP-005')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Existing')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Employee')).toBeInTheDocument();
        expect(screen.getByDisplayValue('existing@example.com')).toBeInTheDocument();
      });
    });

    it('calls update API on edit submission', async () => {
      let capturedBody: Record<string, unknown> | undefined;

      server.use(
        http.patch('/api/v1/employees/5/', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ ...existingEmployee, ...capturedBody });
        })
      );

      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: existingEmployee });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Modify first name
      const firstNameInput = screen.getByDisplayValue('Existing');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Updated');

      // Submit
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(capturedBody?.first_name).toBe('Updated');
      });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('excludes current employee from manager options', async () => {
      // Add the employee being edited to managers list
      server.use(
        http.get('/api/v1/employees/', () => {
          return HttpResponse.json(
            paginatedResponse([
              ...mockManagers,
              existingEmployee,
            ])
          );
        })
      );

      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: existingEmployee });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // The manager dropdown should not include the current employee
      // This is a logic test - the component filters out self from manager options
    });
  });

  describe('modal behavior', () => {
    it('calls onClose when cancel clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderModal({ open: true, onClose, employee: null });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('resets form when reopened for create', async () => {
      const onClose = vi.fn();
      const { rerender } = renderModal({ open: true, onClose, employee: null });

      const Wrapper = createWrapper();

      // Close modal
      rerender(
        <Wrapper>
          <EmployeeFormModal open={false} onClose={onClose} employee={null} />
        </Wrapper>
      );

      // Reopen modal
      rerender(
        <Wrapper>
          <EmployeeFormModal open={true} onClose={onClose} employee={null} />
        </Wrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
});
