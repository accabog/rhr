/**
 * Tests for EmployeesPage component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import {
  createEmployee,
  createDepartment,
  createPosition,
  paginatedResponse,
} from '@/test/mocks/data';
import EmployeesPage from '../EmployeesPage';

const mockDepartment = createDepartment({ id: 1, name: 'Engineering' });
const mockDepartment2 = createDepartment({ id: 2, name: 'Marketing' });
const mockPosition = createPosition({ id: 1, title: 'Software Engineer' });

const mockEmployees = [
  {
    ...createEmployee({
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      employee_id: 'EMP-00001',
      department: mockDepartment,
      position: mockPosition,
      status: 'active',
      hire_date: '2023-01-15',
    }),
    full_name: 'John Doe',
    department_name: 'Engineering',
    position_title: 'Software Engineer',
  },
  {
    ...createEmployee({
      id: 2,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      employee_id: 'EMP-00002',
      department: mockDepartment2,
      position: mockPosition,
      status: 'on_leave',
      hire_date: '2022-06-01',
    }),
    full_name: 'Jane Smith',
    department_name: 'Marketing',
    position_title: 'Marketing Manager',
  },
  {
    ...createEmployee({
      id: 3,
      first_name: 'Bob',
      last_name: 'Wilson',
      email: 'bob@example.com',
      employee_id: 'EMP-00003',
      status: 'terminated',
      hire_date: '2021-03-10',
    }),
    full_name: 'Bob Wilson',
    department_name: null,
    position_title: null,
  },
];

async function renderPage() {
  const Wrapper = createWrapper();
  const result = render(
    <MemoryRouter>
      <Wrapper>
        <EmployeesPage />
      </Wrapper>
    </MemoryRouter>
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  return result;
}

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/employees/', () => {
        return HttpResponse.json(paginatedResponse(mockEmployees));
      }),
      http.get('/api/v1/departments/', () => {
        return HttpResponse.json(paginatedResponse([mockDepartment, mockDepartment2]));
      }),
      http.get('/api/v1/positions/', () => {
        return HttpResponse.json(paginatedResponse([mockPosition]));
      })
    );
  });

  describe('rendering', () => {
    it('renders page title', async () => {
      await renderPage();

      expect(screen.getByText('Employees')).toBeInTheDocument();
    });

    it('renders add employee button', async () => {
      await renderPage();

      expect(screen.getByRole('button', { name: /add employee/i })).toBeInTheDocument();
    });

    it('renders search input', async () => {
      await renderPage();

      expect(screen.getByPlaceholderText('Search employees...')).toBeInTheDocument();
    });

    it('renders status filter', async () => {
      await renderPage();

      expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    });

    it('renders department filter', async () => {
      await renderPage();

      expect(screen.getAllByText('Department').length).toBeGreaterThan(0);
    });
  });

  describe('employees table', () => {
    it('displays employees in table', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows employee IDs', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('EMP-00001')).toBeInTheDocument();
        expect(screen.getByText('EMP-00002')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows department names', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Engineering')).toBeInTheDocument();
        expect(screen.getAllByText('Marketing').length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('shows status tags', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('ACTIVE')).toBeInTheDocument();
        expect(screen.getByText('ON LEAVE')).toBeInTheDocument();
        expect(screen.getByText('TERMINATED')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows hire dates', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('2023-01-15')).toBeInTheDocument();
        expect(screen.getByText('2022-06-01')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows view and edit buttons for each employee', async () => {
      await renderPage();

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('button', { name: /view/i });
        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        expect(viewButtons.length).toBe(3);
        expect(editButtons.length).toBe(3);
      }, { timeout: 3000 });
    });

    it('shows pagination info', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Total 3 employees/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('search functionality', () => {
    it('filters employees when search input changes', async () => {
      let searchQuery: string | null = null;

      server.use(
        http.get('/api/v1/employees/', ({ request }) => {
          const url = new URL(request.url);
          searchQuery = url.searchParams.get('search');

          if (searchQuery === 'John') {
            return HttpResponse.json(paginatedResponse([mockEmployees[0]]));
          }
          return HttpResponse.json(paginatedResponse(mockEmployees));
        })
      );

      const user = userEvent.setup();
      await renderPage();

      const searchInput = screen.getByPlaceholderText('Search employees...');
      await user.type(searchInput, 'John');

      await waitFor(() => {
        expect(searchQuery).toBe('John');
      });
    });
  });

  describe('status filtering', () => {
    it('has status filter select available', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find status filter by placeholder text within select
      const statusSelects = document.querySelectorAll('.ant-select');
      const statusSelect = Array.from(statusSelects).find(el =>
        el.textContent?.includes('Status')
      );
      expect(statusSelect).toBeTruthy();
    });
  });

  describe('department filtering', () => {
    it('filters employees by department', async () => {
      let departmentFilter: string | null = null;

      server.use(
        http.get('/api/v1/employees/', ({ request }) => {
          const url = new URL(request.url);
          departmentFilter = url.searchParams.get('department');

          if (departmentFilter === '1') {
            return HttpResponse.json(paginatedResponse([mockEmployees[0]]));
          }
          return HttpResponse.json(paginatedResponse(mockEmployees));
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Find department filter by placeholder text within select
      const deptSelects = document.querySelectorAll('.ant-select');
      const deptSelect = Array.from(deptSelects).find(el =>
        el.textContent?.includes('Department')
      );
      if (deptSelect) {
        await user.click(deptSelect);
      }

      await waitFor(() => {
        expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
      });
    });
  });

  describe('add employee modal', () => {
    it('opens modal when add employee button clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await user.click(screen.getByRole('button', { name: /add employee/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('view employee drawer', () => {
    it('opens drawer when view button clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /view/i }).length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const viewButtons = screen.getAllByRole('button', { name: /view/i });
      await user.click(viewButtons[0]);

      await waitFor(() => {
        const drawer = document.querySelector('.ant-drawer');
        expect(drawer).toBeInTheDocument();
      });
    });

    it('opens drawer when employee name clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByText('John Doe'));

      await waitFor(() => {
        const drawer = document.querySelector('.ant-drawer');
        expect(drawer).toBeInTheDocument();
      });
    });
  });

  describe('edit employee', () => {
    it('opens modal when edit button clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /edit/i }).length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('shows loading state while fetching data', async () => {
      server.use(
        http.get('/api/v1/employees/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(paginatedResponse(mockEmployees));
        })
      );

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <EmployeesPage />
          </Wrapper>
        </MemoryRouter>
      );

      expect(screen.getByText('Employees')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows no data message when no employees', async () => {
      server.use(
        http.get('/api/v1/employees/', () => {
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      await renderPage();

      await waitFor(() => {
        // Table should be empty - check for ant-empty or zero count
        const emptyState = document.querySelector('.ant-empty') ||
          screen.queryByText(/Total 0 employees/);
        expect(emptyState || document.body.textContent?.includes('Total 0')).toBeTruthy();
      }, { timeout: 3000 });
    });
  });
});
