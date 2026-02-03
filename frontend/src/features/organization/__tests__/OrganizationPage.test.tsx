/**
 * Tests for OrganizationPage component including DepartmentsTab and PositionsTab.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import {
  createDepartment,
  createPosition,
  createEmployee,
  paginatedResponse,
} from '@/test/mocks/data';
import OrganizationPage from '../OrganizationPage';

const mockDepartments = [
  createDepartment({
    id: 1,
    name: 'Engineering',
    code: 'ENG',
    is_active: true,
    employees_count: 10,
  }),
  createDepartment({
    id: 2,
    name: 'Marketing',
    code: 'MKT',
    is_active: true,
    employees_count: 5,
  }),
  createDepartment({
    id: 3,
    name: 'HR',
    code: 'HR',
    is_active: false,
    employees_count: 2,
  }),
];

const mockPositions = [
  createPosition({
    id: 1,
    title: 'Software Engineer',
    department: 1,
    is_active: true,
  }),
  createPosition({
    id: 2,
    title: 'Product Manager',
    department: 1,
    is_active: true,
  }),
  createPosition({
    id: 3,
    title: 'Marketing Lead',
    department: 2,
    is_active: false,
  }),
];

const mockEmployees = [
  {
    ...createEmployee({ id: 1, first_name: 'John', last_name: 'Doe' }),
    full_name: 'John Doe',
  },
];

function renderPage() {
  const Wrapper = createWrapper();
  return render(
    <MemoryRouter>
      <Wrapper>
        <OrganizationPage />
      </Wrapper>
    </MemoryRouter>
  );
}

describe('OrganizationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/departments/', () => {
        return HttpResponse.json(paginatedResponse(mockDepartments));
      }),
      http.get('/api/v1/positions/', () => {
        return HttpResponse.json(paginatedResponse(mockPositions));
      }),
      http.get('/api/v1/employees/', () => {
        return HttpResponse.json(paginatedResponse(mockEmployees));
      })
    );
  });

  describe('rendering', () => {
    it('renders page title', async () => {
      renderPage();

      expect(screen.getByText('Organization Structure')).toBeInTheDocument();
    });

    it('renders departments tab by default', async () => {
      renderPage();

      expect(screen.getByText('Departments')).toBeInTheDocument();
    });

    it('renders positions tab', async () => {
      renderPage();

      expect(screen.getByText('Positions')).toBeInTheDocument();
    });
  });

  describe('DepartmentsTab', () => {
    it('shows add department button', async () => {
      renderPage();

      expect(screen.getByRole('button', { name: /add department/i })).toBeInTheDocument();
    });

    it('shows table headers', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
        expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('shows employee count column', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Employees')).toBeInTheDocument();
      });
    });

    it('opens add department modal', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /add department/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('PositionsTab', () => {
    it('switches to positions tab', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Positions'));

      await waitFor(() => {
        const activeTab = document.querySelector('.ant-tabs-tab-active');
        expect(activeTab?.textContent).toContain('Positions');
      });
    });

    it('shows add position button after switching', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Positions'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add position/i })).toBeInTheDocument();
      });
    });

    it('opens add position modal', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByText('Positions'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add position/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add position/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('department modal', () => {
    it('shows form fields in add modal', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /add department/i }));

      await waitFor(() => {
        expect(screen.getByText('Department Name')).toBeInTheDocument();
        expect(screen.getByText('Code')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
      });
    });

    it('shows manager dropdown', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole('button', { name: /add department/i }));

      await waitFor(() => {
        expect(screen.getByText('Department Manager')).toBeInTheDocument();
      });
    });
  });

});

