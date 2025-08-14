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
import UserManagementPage from './pages/UserManagementPage';
import ApiDocumentationPage from './pages/ApiDocumentationPage';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/Toast';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
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
              <Route path="/contributions/browse" element={<BrowseContributionsPage />} />
              <Route path="/contribute" element={<ContributeInfoPage />} />
              <Route path="/contribute/vehicle" element={<ContributeVehiclePage />} />
              <Route path="/api-docs" element={<ApiDocumentationPage />} />
              <Route path="/admin/dashboard" element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              } />
              <Route path="/admin/users" element={
                <AdminRoute>
                  <UserManagementPage />
                </AdminRoute>
              } />
            </Routes>
          </div>
          <ToastContainer />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
