import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AppNavbar from './components/Navbar';
import HomePage from './pages/HomePage';
import VehiclesPage from './pages/VehiclesPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import UserDashboardPage from './pages/UserDashboardPage';
import UserSettingsPage from './pages/UserSettingsPage';
import BrowseContributionsPage from './pages/BrowseContributionsPage';
import ContributeInfoPage from './pages/ContributeInfoPage';
import ContributeVehiclePage from './pages/ContributeVehiclePage';
import AdminRoute from './components/AdminRoute';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import CustomFieldsManagementPage from './pages/admin/CustomFieldsManagementPage';
import ApiDocumentationPage from './pages/ApiDocumentationPage';
import NotificationsPage from './pages/NotificationsPage';
import NotificationManagementPage from './pages/admin/NotificationManagementPage';
import ComposeNotificationPage from './pages/admin/ComposeNotificationPage';
import NotificationTemplatesPage from './pages/admin/NotificationTemplatesPage';
import ChangelogManagementPage from './pages/admin/ChangelogManagementPage';
import CreateChangelogPage from './pages/admin/CreateChangelogPage';
import ChangelogPage from './pages/ChangelogPage';
import NotificationPreferencesPage from './pages/NotificationPreferencesPage';
import ContributionDetailPage from './pages/ContributionDetailPage';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ToastContainer from './components/Toast';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NotificationProvider>
          <Router>
            <AppNavbar />
            <div className="container mx-auto px-4 py-8 max-w-7xl">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<UserDashboardPage />} />
                <Route path="/settings" element={<UserSettingsPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/notification-preferences" element={<NotificationPreferencesPage />} />
                <Route path="/contributions/browse" element={<BrowseContributionsPage />} />
                <Route path="/contributions/:id" element={<ContributionDetailPage />} />
                <Route path="/contribute" element={<ContributeInfoPage />} />
                <Route path="/contribute/vehicle" element={<ContributeVehiclePage />} />
                <Route path="/api-docs" element={<ApiDocumentationPage />} />
                <Route path="/changelog" element={<ChangelogPage />} />
                <Route path="/changelog/:version" element={<ChangelogPage />} />
                <Route path="/admin/dashboard" element={
                  <AdminRoute>
                    <AdminDashboardPage />
                  </AdminRoute>
                } />
                <Route path="/admin/settings" element={
                  <AdminRoute>
                    <AdminSettingsPage />
                  </AdminRoute>
                } />
                <Route path="/admin/users" element={
                  <AdminRoute>
                    <UserManagementPage />
                  </AdminRoute>
                } />
                <Route path="/admin/custom-fields" element={
                  <AdminRoute>
                    <CustomFieldsManagementPage />
                  </AdminRoute>
                } />
                <Route path="/admin/notifications" element={
                  <AdminRoute>
                    <NotificationManagementPage />
                  </AdminRoute>
                } />
                <Route path="/admin/notifications/compose" element={
                  <AdminRoute>
                    <ComposeNotificationPage />
                  </AdminRoute>
                } />
                <Route path="/admin/notifications/templates" element={
                  <AdminRoute>
                    <NotificationTemplatesPage />
                  </AdminRoute>
                } />
                <Route path="/admin/changelogs" element={
                  <AdminRoute>
                    <ChangelogManagementPage />
                  </AdminRoute>
                } />
                <Route path="/admin/changelogs/create" element={
                  <AdminRoute>
                    <CreateChangelogPage />
                  </AdminRoute>
                } />
              </Routes>
            </div>
            <ToastContainer />
          </Router>
        </NotificationProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
