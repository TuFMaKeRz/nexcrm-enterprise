import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// App Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import UsersPage from './pages/users/UsersPage';
import RolesPage from './pages/roles/RolesPage';
import ProfilePage from './pages/profile/ProfilePage';
import EmailCenterPage from './pages/communication/EmailCenterPage';
import SettingsPage from './pages/settings/SettingsPage';
import LeadsPage from './pages/leads/LeadsPage';
import CustomersPage from './pages/customers/CustomersPage';
import DealsPage from './pages/deals/DealsPage';
import TasksCalendarPage from './pages/tasks/TasksCalendarPage';
import ProductsPage from './pages/products/ProductsPage';
import QuotationsPage from './pages/quotations/QuotationsPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import ReportsPage from './pages/reports/ReportsPage';
import WorkflowsPage from './pages/workflows/WorkflowsPage';
import IndustryPacksPage from './pages/industry/IndustryPacksPage';
import SuperAdminPage from './pages/superadmin/SuperAdminPage';
import LeadCaptureWebhooksPage from './pages/leadcapture/LeadCaptureWebhooksPage';
import PublicLeadFormPage from './pages/public/PublicLeadFormPage';
import ModulePlaceholder from './pages/common/ModulePlaceholder';

// Icons for placeholders
import { Users, UserCheck, Kanban, Calendar, FileText, Receipt, TrendingUp, Settings } from 'lucide-react';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth & Form Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/forms/:slug" element={<PublicLeadFormPage />} />

          {/* Protected CRM Workspace Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="profile" element={<ProfilePage />} />

            {/* Sales Pipeline */}
            <Route path="leads" element={<LeadsPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="deals" element={<DealsPage />} />

            {/* Operations */}
            <Route path="products" element={<ProductsPage />} />
            <Route path="tasks" element={<TasksCalendarPage initialTab="tasks" />} />
            <Route path="calendar" element={<TasksCalendarPage initialTab="calendar" />} />
            <Route path="emails" element={<EmailCenterPage />} />
            <Route path="quotations" element={<QuotationsPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="lead-capture" element={<LeadCaptureWebhooksPage />} />

            {/* Analytics & Automation */}
            <Route path="reports" element={<ReportsPage />} />
            <Route path="workflows" element={<WorkflowsPage />} />
            <Route path="industry-packs" element={<IndustryPacksPage />} />

            {/* Admin */}
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="users/roles" element={<RolesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="super-admin" element={<SuperAdminPage />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
