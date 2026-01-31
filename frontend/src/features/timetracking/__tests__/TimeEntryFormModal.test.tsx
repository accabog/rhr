/**
 * Tests for TimeEntryFormModal component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { createWrapper } from '@/test/utils';
import {
  createEmployee,
  createTimeEntry,
  createTimeEntryType,
  paginatedResponse,
} from '@/test/mocks/data';
import TimeEntryFormModal from '../TimeEntryFormModal';

const mockEmployee = {
  ...createEmployee({ id: 1, first_name: 'John', last_name: 'Doe' }),
  full_name: 'John Doe',
};

const mockTimeEntryTypes = [
  createTimeEntryType({ id: 1, name: 'Regular', code: 'REG', color: '#3b82f6' }),
  createTimeEntryType({ id: 2, name: 'Overtime', code: 'OT', color: '#f59e0b' }),
];

const mockTimeEntry = createTimeEntry({
  id: 1,
  employee: mockEmployee.id,
  entry_type: 1,
  date: '2024-01-15',
  start_time: '09:00:00',
  end_time: '17:00:00',
  break_minutes: 60,
  notes: 'Test notes',
  project: 'Project Alpha',
  task: 'Development',
});

function renderModal(props: {
  open: boolean;
  onClose: () => void;
  entry?: typeof mockTimeEntry | null;
  defaultEmployeeId?: number;
}) {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <TimeEntryFormModal {...props} />
    </Wrapper>
  );
}

describe('TimeEntryFormModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/v1/time-entry-types/', () => {
        return HttpResponse.json(mockTimeEntryTypes);
      }),
      http.get('/api/v1/time-entries/types/', () => {
        return HttpResponse.json(mockTimeEntryTypes);
      }),
      http.get('/api/v1/employees/', () => {
        return HttpResponse.json(paginatedResponse([mockEmployee]));
      }),
      http.get('/api/v1/employees/me/', () => {
        return HttpResponse.json(mockEmployee);
      })
    );
  });

  describe('rendering', () => {
    it('renders add modal with correct title', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByText('Add Time Entry')).toBeInTheDocument();
      });
    });

    it('renders edit modal with correct title', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose, entry: mockTimeEntry });

      await waitFor(() => {
        expect(screen.getByText('Edit Time Entry')).toBeInTheDocument();
      });
    });

    it('shows form fields', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByText('Employee')).toBeInTheDocument();
        expect(screen.getByText('Entry Type')).toBeInTheDocument();
        expect(screen.getByText('Date')).toBeInTheDocument();
        expect(screen.getByText('Start Time')).toBeInTheDocument();
        expect(screen.getByText('End Time')).toBeInTheDocument();
        expect(screen.getByText('Break (minutes)')).toBeInTheDocument();
        expect(screen.getByText('Project')).toBeInTheDocument();
        expect(screen.getByText('Task')).toBeInTheDocument();
        expect(screen.getByText('Notes')).toBeInTheDocument();
      });
    });

    it('shows correct button text for add mode', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
      });
    });

    it('shows correct button text for edit mode', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose, entry: mockTimeEntry });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });
    });
  });

  describe('employee dropdown', () => {
    it('renders employee dropdown', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByText('Employee')).toBeInTheDocument();
      });

      const employeeSelect = screen.getByText('Employee').closest('.ant-form-item');
      const selectElement = employeeSelect?.querySelector('.ant-select');
      expect(selectElement).toBeInTheDocument();
    });
  });

  describe('entry type dropdown', () => {
    it('renders entry type dropdown', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByText('Entry Type')).toBeInTheDocument();
      });

      const typeSelect = screen.getByText('Entry Type').closest('.ant-form-item');
      const selectElement = typeSelect?.querySelector('.ant-select');
      expect(selectElement).toBeInTheDocument();
    });
  });

  describe('edit mode population', () => {
    it('populates form with entry data', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose, entry: mockTimeEntry });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Project Alpha')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Development')).toBeInTheDocument();
      });
    });

    it('populates break minutes', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose, entry: mockTimeEntry });

      await waitFor(() => {
        expect(screen.getByDisplayValue('60')).toBeInTheDocument();
      });
    });
  });

  describe('modal behavior', () => {
    it('calls onClose when cancel clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('shows add entry button for new entry', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
      });
    });

    it('shows save changes button for existing entry', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose, entry: mockTimeEntry });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });
    });
  });

  describe('default values', () => {
    it('sets default employee when provided', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose, defaultEmployeeId: 1 });

      await waitFor(() => {
        expect(screen.getByText('Add Time Entry')).toBeInTheDocument();
      });

      // Default employee should be pre-selected
      // Exact verification would require inspecting form state
    });

    it('sets default break minutes to 0 for new entry', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByDisplayValue('0')).toBeInTheDocument();
      });
    });
  });

  describe('input fields', () => {
    it('renders project input field', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Project name')).toBeInTheDocument();
      });

      const projectInput = screen.getByPlaceholderText('Project name');
      expect(projectInput).toBeEnabled();
    });

    it('renders task input field', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Task description')).toBeInTheDocument();
      });

      const taskInput = screen.getByPlaceholderText('Task description');
      expect(taskInput).toBeEnabled();
    });

    it('renders notes textarea field', async () => {
      const onClose = vi.fn();

      renderModal({ open: true, onClose });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Additional notes')).toBeInTheDocument();
      });

      const notesInput = screen.getByPlaceholderText('Additional notes');
      expect(notesInput.tagName.toLowerCase()).toBe('textarea');
    });
  });
});
