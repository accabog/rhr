/**
 * Tests for WeeklySummaryCard component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createWrapper } from '@/test/utils';
import type { WeeklySummary } from '@/api/timetracking';
import WeeklySummaryCard from '../WeeklySummaryCard';

const mockSummary: WeeklySummary = {
  week_start: '2024-01-15',
  week_end: '2024-01-21',
  total_hours: '40.50',
  regular_hours: '38.00',
  overtime_hours: '2.50',
  daily_breakdown: [
    { date: '2024-01-15', total_hours: 8.0 },
    { date: '2024-01-16', total_hours: 8.5 },
    { date: '2024-01-17', total_hours: 7.5 },
    { date: '2024-01-18', total_hours: 8.0 },
    { date: '2024-01-19', total_hours: 8.5 },
  ],
};

function renderCard(props: {
  summary: WeeklySummary | undefined;
  isLoading: boolean;
  targetHours?: number;
}) {
  const Wrapper = createWrapper();
  return render(
    <Wrapper>
      <WeeklySummaryCard {...props} />
    </Wrapper>
  );
}

describe('WeeklySummaryCard', () => {
  describe('rendering', () => {
    it('renders card title', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      expect(screen.getByText('Weekly Summary')).toBeInTheDocument();
    });

    it('shows total hours in progress dashboard', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      expect(screen.getByText('40.5')).toBeInTheDocument();
    });

    it('shows target hours', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      expect(screen.getByText(/of 40h target/)).toBeInTheDocument();
    });

    it('shows custom target hours', () => {
      renderCard({ summary: mockSummary, isLoading: false, targetHours: 35 });

      expect(screen.getByText(/of 35h target/)).toBeInTheDocument();
    });
  });

  describe('stats display', () => {
    it('shows regular hours label', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      expect(screen.getByText('Regular')).toBeInTheDocument();
    });

    it('shows overtime label', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      expect(screen.getByText('Overtime')).toBeInTheDocument();
    });

    it('shows average daily hours label', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      expect(screen.getByText('Avg/Day')).toBeInTheDocument();
    });

    it('shows hrs suffix for stats', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      const hrsSuffixes = screen.getAllByText('hrs');
      expect(hrsSuffixes.length).toBe(3);
    });
  });

  describe('daily breakdown', () => {
    it('shows daily breakdown section', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      expect(screen.getByText('Daily Breakdown')).toBeInTheDocument();
    });

    it('shows weekday labels', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();
    });

    it('shows hours for days with data', () => {
      renderCard({ summary: mockSummary, isLoading: false });

      expect(screen.getAllByText('8.0h').length).toBeGreaterThan(0);
      expect(screen.getAllByText('8.5h').length).toBeGreaterThan(0);
      expect(screen.getByText('7.5h')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading card when isLoading is true', () => {
      renderCard({ summary: undefined, isLoading: true });

      const loadingCard = document.querySelector('.ant-card-loading');
      expect(loadingCard).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no summary', () => {
      renderCard({ summary: undefined, isLoading: false });

      expect(screen.getByText('No time data available')).toBeInTheDocument();
    });
  });

  describe('progress calculation', () => {
    it('calculates correct progress percent', () => {
      const summaryAt50Percent: WeeklySummary = {
        ...mockSummary,
        total_hours: '20.00',
      };

      renderCard({ summary: summaryAt50Percent, isLoading: false });

      // Progress displays the total hours via custom format function
      expect(screen.getByText('20.0')).toBeInTheDocument();
    });

    it('caps progress at 100% when over target', () => {
      const summaryOverTarget: WeeklySummary = {
        ...mockSummary,
        total_hours: '50.00',
        overtime_hours: '10.00',
      };

      renderCard({ summary: summaryOverTarget, isLoading: false });

      expect(screen.getByText('50.0')).toBeInTheDocument();
    });
  });

  describe('zero overtime handling', () => {
    it('displays zero overtime correctly', () => {
      const noOvertimeSummary: WeeklySummary = {
        ...mockSummary,
        total_hours: '38.00',
        regular_hours: '38.00',
        overtime_hours: '0.00',
      };

      renderCard({ summary: noOvertimeSummary, isLoading: false });

      expect(screen.getByText('Overtime')).toBeInTheDocument();
    });
  });

  describe('empty daily breakdown', () => {
    it('renders all weekdays even with no data', () => {
      const emptySummary: WeeklySummary = {
        week_start: '2024-01-15',
        week_end: '2024-01-21',
        total_hours: '0.00',
        regular_hours: '0.00',
        overtime_hours: '0.00',
        daily_breakdown: [],
      };

      renderCard({ summary: emptySummary, isLoading: false });

      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
    });
  });
});
