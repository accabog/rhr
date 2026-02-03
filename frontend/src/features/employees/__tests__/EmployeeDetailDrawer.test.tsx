/**
 * Tests for EmployeeDetailDrawer component.
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
} from '@/test/mocks/data';
import EmployeeDetailDrawer from '../EmployeeDetailDrawer';

const mockDepartment = createDepartment({ id: 1, name: 'Engineering' });
const mockPosition = createPosition({ id: 1, title: 'Software Engineer' });

const mockEmployee = {
  ...createEmployee({
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-1234',
    employee_id: 'EMP-00001',
    department: mockDepartment,
    position: mockPosition,
    status: 'active',
    hire_date: '2023-01-15',
  }),
  full_name: 'John Doe',
  department_name: 'Engineering',
  position_title: 'Software Engineer',
  manager_name: 'Jane Manager',
  date_of_birth: '1990-05-15',
  address: '123 Main St, City',
  emergency_contact_name: 'Mary Doe',
  emergency_contact_phone: '555-5678',
};

function renderDrawer(props: {
  employeeId: number | null;
  open: boolean;
  onClose: () => void;
  onEdit: (id: number) => void;
}) {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <EmployeeDetailDrawer {...props} />
    </Wrapper>
  );
}

describe('EmployeeDetailDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/employees/:id/', ({ params }) => {
        if (Number(params.id) === 1) {
          return HttpResponse.json(mockEmployee);
        }
        return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
      }),
      http.get('/api/v1/documents/', () => {
        return HttpResponse.json([]);
      })
    );
  });

  describe('rendering', () => {
    it('renders drawer when open', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        const drawer = document.querySelector('.ant-drawer');
        expect(drawer).toBeInTheDocument();
      });
    });

    it('does not render drawer when closed', () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: false, onClose, onEdit });

      const drawer = document.querySelector('.ant-drawer-open');
      expect(drawer).not.toBeInTheDocument();
    });

    it('shows loading spinner while fetching', async () => {
      server.use(
        http.get('/api/v1/employees/:id/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return HttpResponse.json(mockEmployee);
        })
      );

      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        const spinner = document.querySelector('.ant-spin');
        expect(spinner).toBeInTheDocument();
      });
    });
  });

  describe('employee info display', () => {
    it('displays employee name and avatar section', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays position and department', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getAllByText(/Software Engineer/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Engineering/).length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('displays employee ID', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('EMP-00001')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays status tag', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays email', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays phone', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('555-1234')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays hire date', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('2023-01-15')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays manager name', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('Jane Manager')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('personal information', () => {
    it('displays personal information section', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('Personal Information')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays date of birth', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('1990-05-15')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays address', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('123 Main St, City')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('emergency contact', () => {
    it('displays emergency contact section', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays emergency contact name', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('Mary Doe')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('displays emergency contact phone', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('555-5678')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('tabs', () => {
    it('shows information tab by default', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('Information')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows all tab labels', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('Information')).toBeInTheDocument();
        expect(screen.getByText('Time & Attendance')).toBeInTheDocument();
        expect(screen.getByText('Leave')).toBeInTheDocument();
        expect(screen.getByText('Contracts')).toBeInTheDocument();
        expect(screen.getByText('Documents')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('switches to documents tab', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByText('Documents'));

      await waitFor(() => {
        const docsTab = document.querySelector('.ant-tabs-tab-active');
        expect(docsTab?.textContent).toContain('Documents');
      });
    });
  });

  describe('actions', () => {
    it('shows edit button', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('shows delete button', async () => {
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });

    it('calls onEdit when edit button clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThan(0);
      });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      expect(onEdit).toHaveBeenCalledWith(1);
    });

    it('shows delete confirmation', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText('Delete Employee')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete this employee?')).toBeInTheDocument();
      });
    });

    it('calls delete API when confirmed', async () => {
      let deleteCalled = false;

      server.use(
        http.delete('/api/v1/employees/:id/', () => {
          deleteCalled = true;
          return new HttpResponse(null, { status: 204 });
        })
      );

      const user = userEvent.setup();
      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 1, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText('Delete Employee')).toBeInTheDocument();
      });

      const popconfirmDeleteButton = document.querySelector('.ant-popconfirm-buttons button.ant-btn-dangerous');
      if (popconfirmDeleteButton) {
        await user.click(popconfirmDeleteButton);
      }

      await waitFor(() => {
        expect(deleteCalled).toBe(true);
      });
    });
  });

  describe('not found state', () => {
    it('shows not found message when employee does not exist', async () => {
      server.use(
        http.get('/api/v1/employees/:id/', () => {
          return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
        })
      );

      const onClose = vi.fn();
      const onEdit = vi.fn();

      renderDrawer({ employeeId: 999, open: true, onClose, onEdit });

      await waitFor(() => {
        expect(screen.getByText('Employee not found')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
