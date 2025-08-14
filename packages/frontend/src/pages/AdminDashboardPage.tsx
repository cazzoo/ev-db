import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminStats, AdminStats } from '../services/api';
import {
  UsersIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import EnhancedStats from '../components/EnhancedStats';
import DevAdminActions from '../components/DevAdminActions';

const AdminDashboardPage = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);



  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchAdminStats();
        setStats(data);
      } catch (err) {
        setError((err as Error).message || 'Failed to load admin statistics');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>{error}</span>
      </div>
    );
  }

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
    // Reload stats after successful wipe
    const loadStats = async () => {
      try {
        const data = await fetchAdminStats();
        setStats(data);
      } catch (err) {
        setError((err as Error).message || 'Failed to reload admin statistics');
      }
    };
    loadStats();

    // Clear success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Clear error message after 5 seconds
    setTimeout(() => setError(null), 5000);
  };



  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-base-content/70 mt-2">Manage users and monitor system statistics</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/users" className="btn btn-primary">
            <UsersIcon className="h-5 w-5" />
            Manage Users
          </Link>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="alert alert-success mb-6">
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-6">
          <span>{error}</span>
        </div>
      )}

      {/* Admin Stats */}
      {stats && (
        <EnhancedStats
          title="System Overview"
          stats={[
            {
              id: 'totalUsers',
              title: 'Total Users',
              value: stats.totalUsers,
              icon: <UsersIcon className="w-6 h-6" />,
              color: 'primary',
              description: 'Registered accounts'
            },
            {
              id: 'admins',
              title: 'Admins',
              value: stats.roleStats?.ADMIN || 0,
              icon: <UserGroupIcon className="w-6 h-6" />,
              color: 'secondary',
              description: 'Administrator accounts'
            },
            {
              id: 'moderators',
              title: 'Moderators',
              value: stats.roleStats?.MODERATOR || 0,
              icon: <Cog6ToothIcon className="w-6 h-6" />,
              color: 'accent',
              description: 'Moderator accounts'
            },
            {
              id: 'totalCredits',
              title: 'Total Credits',
              value: stats.totalCurrency,
              icon: <CurrencyDollarIcon className="w-6 h-6" />,
              color: 'info',
              description: 'App currency in circulation'
            }
          ]}
          className="mb-8"
        />
      )}

      {/* Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <ChartBarIcon className="h-6 w-6" />
              User Role Distribution
            </h2>
            <div className="space-y-4">
              {stats?.roleStats && Object.entries(stats.roleStats).map(([role, count]) => (
                <div key={role} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`badge ${
                      role === 'ADMIN' ? 'badge-error' :
                      role === 'MODERATOR' ? 'badge-warning' :
                      'badge-info'
                    }`}>
                      {role}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{count}</div>
                    <div className="text-sm text-base-content/60">
                      {stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Balances */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <CurrencyDollarIcon className="h-6 w-6" />
              Top Credit Balances
            </h2>
            <div className="space-y-3">
              {stats?.topBalances?.map((user, index) => (
                <div key={user.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="badge badge-outline">{index + 1}</div>
                    <span className="truncate max-w-48">{user.email}</span>
                  </div>
                  <div className="font-semibold">{user.appCurrencyBalance}</div>
                </div>
              )) || (
                <div className="text-center text-base-content/60 py-4">
                  No users found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Link to="/admin/users" className="btn btn-outline btn-primary">
              <UsersIcon className="h-5 w-5" />
              Manage All Users
            </Link>
            <Link to="/admin/users?role=ADMIN" className="btn btn-outline btn-secondary">
              <UserGroupIcon className="h-5 w-5" />
              View Admins
            </Link>
            <Link to="/admin/users?role=MODERATOR" className="btn btn-outline btn-accent">
              <Cog6ToothIcon className="h-5 w-5" />
              View Moderators
            </Link>
          </div>
        </div>
      </div>

      {/* Development Admin Actions */}
      <DevAdminActions
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
};

export default AdminDashboardPage;
