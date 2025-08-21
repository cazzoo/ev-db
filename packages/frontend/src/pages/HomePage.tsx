import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchUsers, fetchStats, Stats, fetchRecentVehicles, fetchRecentContributions, Vehicle, Contribution } from '../services/api';
import EnhancedStats, { StatIcons } from '../components/EnhancedStats';
import SpotlightSection from '../components/SpotlightSection';

interface User {
  id: number;
  email: string;
  role: string;
  appCurrencyBalance: number;
}

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Spotlight data
  const [recentVehicles, setRecentVehicles] = useState<Vehicle[]>([]);
  const [recentContributions, setRecentContributions] = useState<Contribution[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [contributionsLoading, setContributionsLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);
  const [contributionsError, setContributionsError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const getUsers = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data);
      } catch (err) {
        setError((err as Error).message || 'Failed to fetch users. Please ensure the backend server is running and accessible.');
      } finally {
        setLoading(false);
      }
    };

    const getStats = async () => {
      try {
        const s = await fetchStats();
        setStats(s);
      } catch (err) {
        setStatsError((err as Error).message || 'Failed to fetch statistics.');
      }
    };

    const loadRecentVehicles = async () => {
      try {
        setVehiclesLoading(true);
        const data = await fetchRecentVehicles(5);
        setRecentVehicles(data.vehicles);
      } catch (err) {
        setVehiclesError(err instanceof Error ? err.message : 'Failed to load recent vehicles');
      } finally {
        setVehiclesLoading(false);
      }
    };

    const loadRecentContributions = async () => {
      try {
        setContributionsLoading(true);
        const data = await fetchRecentContributions(5);
        setRecentContributions(data.contributions);
      } catch (err) {
        setContributionsError(err instanceof Error ? err.message : 'Failed to load recent contributions');
      } finally {
        setContributionsLoading(false);
      }
    };

    getUsers();
    getStats();
    loadRecentVehicles();
    loadRecentContributions();
  }, []);

  // Handle contribution click - navigate to contributions page with specific contribution
  const handleContributionClick = (contribution: Contribution) => {
    navigate('/contributions/browse', {
      state: { openContributionId: contribution.id }
    });
  };

  // Handle vehicle click - navigate to vehicles page
  const handleVehicleClick = (vehicle: Vehicle) => {
    navigate('/vehicles');
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-4">Welcome to the EV Database</h1>
      <p className="text-base-content/70 mb-8">Open, community-driven EV data. Contribute to make it better.</p>

      {/* Stats Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Community statistics</h2>
        {statsError && (
          <div className="alert alert-warning mb-4">
            <span>{statsError}</span>
          </div>
        )}
        {stats ? (
          <>
            <EnhancedStats
              title="Platform Statistics"
              stats={[
                {
                  id: 'vehicles',
                  title: 'Total Vehicles',
                  value: stats.vehiclesCount,
                  icon: StatIcons.vehicles,
                  color: 'primary',
                  description: 'Electric vehicles in database'
                },
                {
                  id: 'users',
                  title: 'Total Users',
                  value: stats.usersCount,
                  icon: StatIcons.users,
                  color: 'secondary',
                  description: 'Registered community members'
                },
                {
                  id: 'contributions',
                  title: 'Total Contributions',
                  value: stats.contributionsTotal,
                  icon: StatIcons.contributions,
                  color: 'info',
                  description: 'All submissions received'
                },
                {
                  id: 'contributors',
                  title: 'Active Contributors',
                  value: stats.contributorsCount,
                  icon: StatIcons.users,
                  color: 'accent',
                  description: 'Users with submissions'
                }
              ]}
              className="mb-8"
            />

            <EnhancedStats
              title="Contribution Status"
              stats={[
                {
                  id: 'pending',
                  title: 'Pending Review',
                  value: stats.contributionsPending,
                  icon: StatIcons.pending,
                  color: 'warning',
                  description: 'Awaiting moderation'
                },
                {
                  id: 'approved',
                  title: 'Approved',
                  value: stats.contributionsApproved,
                  icon: StatIcons.approved,
                  color: 'success',
                  description: 'Successfully reviewed'
                },
                {
                  id: 'rejected',
                  title: 'Rejected',
                  value: stats.contributionsRejected,
                  icon: StatIcons.rejected,
                  color: 'error',
                  description: 'Did not meet criteria'
                }
              ]}
              className="mb-8"
            />
          </>

        ) : (
          <div className="flex justify-center items-center py-12">
            <div className="loading loading-spinner loading-lg"></div>
            <span className="ml-4 text-lg">Loading Statistics...</span>
          </div>
        )}
      </section>

      {/* Spotlight Sections */}
      <SpotlightSection
        title="Recently Added Vehicles"
        items={recentVehicles}
        type="vehicles"
        loading={vehiclesLoading}
        error={vehiclesError}
        viewAllLink="/vehicles"
        className="mb-8"
        onVehicleClick={handleVehicleClick}
      />

      <SpotlightSection
        title="Recent Contributions"
        items={recentContributions}
        type="contributions"
        loading={contributionsLoading}
        error={contributionsError}
        viewAllLink="/contributions/browse"
        className="mb-8"
        onContributionClick={handleContributionClick}
      />

      {/* CTA Section */}
      <section className="mb-8">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="card-title">Help grow the EV Database</h3>
                <p>Submit vehicle data or vote on pending contributions to improve accuracy.</p>
              </div>
              <div className="flex gap-2">
                <Link to="/contributions/browse" className="btn btn-outline btn-primary">Browse Contributions</Link>
                {isAuthenticated ? (
                  <Link to="/dashboard" className="btn btn-primary">Submit a Contribution</Link>
                ) : (
                  <Link to="/register" className="btn btn-primary">Create an Account</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <h2 className="text-2xl font-semibold mb-4">Registered Users</h2>
      {loading && <p>Loading users...</p>}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}
      {!loading && !error && users.length === 0 && <p>No users found.</p>}
      {!loading && !error && users.length > 0 && (
        <ul className="space-y-2">
          {users.map(user => (
            <li key={user.id} className="p-3 bg-base-100 rounded-lg shadow">
              {user.email} ({user.role}) - Credits: {user.appCurrencyBalance}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HomePage;
