/**
 * Tests for ContractsPage component.
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
  createContractListItem,
  createContractType,
  paginatedResponse,
} from '@/test/mocks/data';
import ContractsPage from '../ContractsPage';

const mockEmployee = createEmployee({ id: 1, first_name: 'John', last_name: 'Doe' });
const mockEmployee2 = createEmployee({ id: 2, first_name: 'Jane', last_name: 'Smith' });

const mockContractTypes = [
  createContractType({ id: 1, name: 'Full-time', code: 'FT' }),
  createContractType({ id: 2, name: 'Part-time', code: 'PT' }),
  createContractType({ id: 3, name: 'Contractor', code: 'CONT' }),
];

const mockContracts = [
  createContractListItem({
    id: 1,
    employee: 1,
    employee_name: 'John Doe',
    contract_type: 1,
    contract_type_name: 'Full-time',
    title: 'Software Engineer Contract',
    start_date: '2024-01-01',
    end_date: '2025-01-01',
    status: 'active',
    salary: '75000.00',
    salary_currency: 'USD',
    salary_period: 'yearly',
    is_expiring_soon: false,
  }),
  createContractListItem({
    id: 2,
    employee: 2,
    employee_name: 'Jane Smith',
    contract_type: 1,
    contract_type_name: 'Full-time',
    title: 'Product Manager Contract',
    start_date: '2024-02-01',
    end_date: null,
    status: 'active',
    salary: '85000.00',
    salary_currency: 'USD',
    salary_period: 'yearly',
    is_expiring_soon: false,
  }),
  createContractListItem({
    id: 3,
    employee: 1,
    employee_name: 'John Doe',
    contract_type: 2,
    contract_type_name: 'Part-time',
    title: 'Consulting Agreement',
    start_date: '2024-03-01',
    end_date: '2024-06-30',
    status: 'draft',
    salary: '50.00',
    salary_currency: 'USD',
    salary_period: 'hourly',
    is_expiring_soon: false,
  }),
];

const mockExpiringContracts = [
  createContractListItem({
    id: 10,
    employee_name: 'Bob Wilson',
    title: 'Expiring Contract',
    start_date: '2023-01-01',
    end_date: '2024-02-15',
    status: 'active',
    is_expiring_soon: true,
  }),
];

const mockStats = {
  total: 10,
  active: 8,
  draft: 1,
  expired: 0,
  expiring_soon: 1,
};

async function renderPage() {
  const Wrapper = createWrapper();
  const result = render(
    <MemoryRouter>
      <Wrapper>
        <ContractsPage />
      </Wrapper>
    </MemoryRouter>
  );

  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  return result;
}

describe('ContractsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/contracts/', () => {
        return HttpResponse.json(paginatedResponse(mockContracts));
      }),
      http.get('/api/v1/contracts/types/', () => {
        return HttpResponse.json(mockContractTypes);
      }),
      http.get('/api/v1/contracts/stats/', () => {
        return HttpResponse.json(mockStats);
      }),
      http.get('/api/v1/contracts/expiring/', () => {
        return HttpResponse.json([]);
      }),
      http.get('/api/v1/employees/', () => {
        return HttpResponse.json(paginatedResponse([mockEmployee, mockEmployee2]));
      })
    );
  });

  describe('rendering', () => {
    it('renders page title', async () => {
      await renderPage();

      expect(screen.getByText('Contracts')).toBeInTheDocument();
    });

    it('renders new contract button', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new contract/i })).toBeInTheDocument();
      });
    });

    it('renders status filter dropdown', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Filter by status')).toBeInTheDocument();
      });
    });
  });

  describe('stats cards', () => {
    it('displays total contracts stat', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Total Contracts')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('displays active contracts stat', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
        expect(screen.getByText('8')).toBeInTheDocument();
      });
    });

    it('displays draft contracts stat', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
        expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      });
    });

    it('displays expiring soon stat', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      });
    });
  });

  describe('contracts table', () => {
    it('displays contracts in table', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Software Engineer Contract')).toBeInTheDocument();
        expect(screen.getByText('Product Manager Contract')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows employee names', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows contract type', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('Full-time').length).toBeGreaterThan(0);
        expect(screen.getByText('Part-time')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows status tags', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('shows salary information', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/75,000/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('expiring contracts alert', () => {
    it('shows alert when contracts are expiring soon', async () => {
      server.use(
        http.get('/api/v1/contracts/expiring/', () => {
          return HttpResponse.json(mockExpiringContracts);
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/1 contract expiring within 30 days/)).toBeInTheDocument();
      });
    });

    it('shows expiring contract details in alert', async () => {
      server.use(
        http.get('/api/v1/contracts/expiring/', () => {
          return HttpResponse.json(mockExpiringContracts);
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText(/Bob Wilson/)).toBeInTheDocument();
        expect(screen.getByText(/Expiring Contract/)).toBeInTheDocument();
      });
    });

    it('does not show alert when no contracts expiring', async () => {
      await renderPage();

      await waitFor(() => {
        expect(screen.queryByText(/contract.*expiring within 30 days/)).not.toBeInTheDocument();
      });
    });
  });

  describe('contract actions', () => {
    it('shows activate button for draft contracts', async () => {
      await renderPage();

      await waitFor(() => {
        const activateButtons = screen.getAllByRole('button', { name: /activate/i });
        expect(activateButtons.length).toBe(1);
      }, { timeout: 3000 });
    });

    it('shows terminate button for active contracts', async () => {
      await renderPage();

      await waitFor(() => {
        const terminateButtons = screen.getAllByRole('button', { name: /terminate/i });
        expect(terminateButtons.length).toBe(2);
      }, { timeout: 3000 });
    });

    it('shows delete button for draft contracts', async () => {
      await renderPage();

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        expect(deleteButtons.length).toBe(1);
      }, { timeout: 3000 });
    });

    it('calls activate API when activate clicked', async () => {
      let activateCalledWithId: number | null = null;

      server.use(
        http.post('/api/v1/contracts/:id/activate/', ({ params }) => {
          activateCalledWithId = Number(params.id);
          return HttpResponse.json({
            ...mockContracts[2],
            id: Number(params.id),
            status: 'active',
          });
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByRole('button', { name: /activate/i }));

      await waitFor(() => {
        expect(activateCalledWithId).toBe(3);
      });
    });

    it('shows confirmation when terminate clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /terminate/i }).length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const terminateButtons = screen.getAllByRole('button', { name: /terminate/i });
      await user.click(terminateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Terminate this contract?')).toBeInTheDocument();
      });
    });

    it('calls terminate API when confirmed', async () => {
      let terminateCalledWithId: number | null = null;

      server.use(
        http.post('/api/v1/contracts/:id/terminate/', ({ params }) => {
          terminateCalledWithId = Number(params.id);
          return HttpResponse.json({
            ...mockContracts[0],
            id: Number(params.id),
            status: 'terminated',
          });
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /terminate/i }).length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const terminateButtons = screen.getAllByRole('button', { name: /terminate/i });
      await user.click(terminateButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Terminate this contract?')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /^terminate$/i }));

      await waitFor(() => {
        expect(terminateCalledWithId).toBe(1);
      });
    });

    it('shows delete confirmation when delete clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByRole('button', { name: /delete/i }));

      await waitFor(() => {
        expect(screen.getByText('Delete this contract?')).toBeInTheDocument();
      });
    });

    it('calls delete API when confirmed', async () => {
      let deleteCalledWithId: number | null = null;

      server.use(
        http.delete('/api/v1/contracts/:id/', ({ params }) => {
          deleteCalledWithId = Number(params.id);
          return new HttpResponse(null, { status: 204 });
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        expect(deleteButtons.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete this contract?')).toBeInTheDocument();
      });

      const popconfirmDeleteButton = document.querySelector('.ant-popconfirm-buttons button.ant-btn-dangerous');
      if (popconfirmDeleteButton) {
        await user.click(popconfirmDeleteButton);
      }

      await waitFor(() => {
        expect(deleteCalledWithId).toBe(3);
      });
    });
  });

  describe('create contract modal', () => {
    it('opens modal when new contract button clicked', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new contract/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /new contract/i }));

      await waitFor(() => {
        expect(screen.getByText('Create Contract')).toBeInTheDocument();
      });
    });

    it('shows employee dropdown in modal', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new contract/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /new contract/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        const employeeLabels = screen.getAllByText('Employee');
        expect(employeeLabels.length).toBeGreaterThan(1);
      });
    });

    it('shows contract type dropdown in modal', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new contract/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /new contract/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Contract Type')).toBeInTheDocument();
      });
    });

    it('shows salary fields in modal', async () => {
      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /new contract/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /new contract/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        const salaryLabels = screen.getAllByText('Salary');
        expect(salaryLabels.length).toBeGreaterThan(1);
        expect(screen.getByText('Currency')).toBeInTheDocument();
      });
    });
  });

  describe('status filtering', () => {
    it('filters contracts by status when filter selected', async () => {
      server.use(
        http.get('/api/v1/contracts/', ({ request }) => {
          const url = new URL(request.url);
          const status = url.searchParams.get('status');

          if (status === 'draft') {
            return HttpResponse.json(
              paginatedResponse([mockContracts[2]])
            );
          }
          return HttpResponse.json(paginatedResponse(mockContracts));
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('Software Engineer Contract')).toBeInTheDocument();
      }, { timeout: 3000 });

      const filterSelect = screen.getByText('Filter by status').closest('.ant-select');
      if (filterSelect) {
        await user.click(filterSelect);
      }

      await waitFor(() => {
        expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
      });

      const draftOptions = screen.getAllByText('Draft');
      await user.click(draftOptions[draftOptions.length - 1]);

      await waitFor(() => {
        expect(screen.getByText('Consulting Agreement')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('empty state', () => {
    it('shows empty state when no contracts', async () => {
      server.use(
        http.get('/api/v1/contracts/', () => {
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByText('No contracts found')).toBeInTheDocument();
      });
    });

    it('shows create button in empty state', async () => {
      server.use(
        http.get('/api/v1/contracts/', () => {
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create first contract/i })).toBeInTheDocument();
      });
    });

    it('opens modal from empty state button', async () => {
      server.use(
        http.get('/api/v1/contracts/', () => {
          return HttpResponse.json(paginatedResponse([]));
        })
      );

      const user = userEvent.setup();
      await renderPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create first contract/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create first contract/i }));

      await waitFor(() => {
        expect(screen.getByText('Create Contract')).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('shows loading state while fetching data', async () => {
      server.use(
        http.get('/api/v1/contracts/', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json(paginatedResponse(mockContracts));
        })
      );

      const Wrapper = createWrapper();
      render(
        <MemoryRouter>
          <Wrapper>
            <ContractsPage />
          </Wrapper>
        </MemoryRouter>
      );

      expect(screen.getByText('Contracts')).toBeInTheDocument();
    });
  });
});
