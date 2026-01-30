import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from '@/stores/authStore';
import AppLayout from '@/layouts/AppLayout';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import DashboardPage from '@/features/dashboard/DashboardPage';
import EmployeesPage from '@/features/employees/EmployeesPage';
import OrganizationPage from '@/features/organization/OrganizationPage';
import TimeTrackingPage from '@/features/timetracking/TimeTrackingPage';
import TimesheetsPage from '@/features/timesheets/TimesheetsPage';
import TimesheetDetailPage from '@/features/timesheets/TimesheetDetailPage';
import LeavePage from '@/features/leave/LeavePage';
import ContractsPage from '@/features/contracts/ContractsPage';
import ProfilePage from '@/features/profile/ProfilePage';
import SettingsPage from '@/features/settings/SettingsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="employees" element={<EmployeesPage />} />
          <Route path="organization" element={<OrganizationPage />} />
          <Route path="time-tracking" element={<TimeTrackingPage />} />
          <Route path="timesheets" element={<TimesheetsPage />} />
          <Route path="timesheets/:id" element={<TimesheetDetailPage />} />
          <Route path="leave" element={<LeavePage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
