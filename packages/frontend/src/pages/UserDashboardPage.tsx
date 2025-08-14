import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { submitContribution, fetchMyContributions, Contribution, Vehicle, cancelMyContribution, fetchApiKeys, createApiKey, revokeApiKey, fetchApiUsage, fetchApiUsageStats, ApiKey, DailyUsage, DailyUsagePerKey } from '../services/api';
import ContributionForm from '../components/ContributionForm';
import DataTable, { Column } from '../components/DataTable';
import ApiUsageChart from '../components/ApiUsageChart';
import ApiUsageHistoryModal from '../components/ApiUsageHistoryModal';

const UserDashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [myContributions, setMyContributions] = useState<Contribution[]>([]);
  const [loadingContributions, setLoadingContributions] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [dailyUsagePerKey, setDailyUsagePerKey] = useState<DailyUsagePerKey[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const handleShowContributionModal = () => setShowContributionModal(true);
  const handleCloseContributionModal = () => setShowContributionModal(false);

  const loadMyContributions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoadingContributions(true);
      const data = await fetchMyContributions();
      setMyContributions(data);
    } catch (err) {
      setError((err as Error).message || 'Failed to load your contributions.');
    } finally {
      setLoadingContributions(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadMyContributions();
    const loadApiData = async () => {
      try {
        const [keys, usage, usagePerKey] = await Promise.all([
          fetchApiKeys(),
          fetchApiUsage(),
          fetchApiUsageStats()
        ]);
        setApiKeys(keys);
        setDailyUsage(usage);
        setDailyUsagePerKey(usagePerKey);
      } catch (err) {
        setApiError((err as Error).message || 'Failed to load API data.');
      }
    };
    loadApiData();
  }, [loadMyContributions]);

  const handleSubmitContribution = async (vehicleData: Vehicle, changeType?: 'NEW' | 'UPDATE', targetVehicleId?: number) => {
    setError(null);
    setSuccess(null);
    try {
      await submitContribution(vehicleData, changeType, targetVehicleId);
      setSuccess('Contribution submitted successfully! It will be reviewed by moderators.');
      handleCloseContributionModal();
      loadMyContributions(); // Refresh contributions list
    } catch (err) {
      setError((err as Error).message || 'Failed to submit contribution.');
    }
  };

  // API Keys table columns
  const apiKeysColumns: Column<ApiKey>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: 'id',
    },
    {
      key: 'name',
      header: 'Name',
      accessor: 'name',
      render: (value) => String(value || '-'),
    },
    {
      key: 'key',
      header: 'Key',
      accessor: 'key',
      render: (value, item) => {
        const isRevoked = !!item.revokedAt;
        const isExpired = !isRevoked && !!item.expiresAt && new Date(item.expiresAt) < new Date();
        const keyClass = isRevoked || isExpired ? 'text-gray-400' : '';
        return <code className={keyClass}>{String(value)}</code>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, item) => {
        const isRevoked = !!item.revokedAt;
        const isExpired = !isRevoked && !!item.expiresAt && new Date(item.expiresAt) < new Date();
        const status = isRevoked ? 'Revoked' : isExpired ? 'Expired' : 'Active';
        const badgeClass = isRevoked ? 'badge-error' : isExpired ? 'badge-warning' : 'badge-success';
        return <span className={`badge ${badgeClass}`}>{status}</span>;
      },
    },
    {
      key: 'createdAt',
      header: 'Created',
      accessor: 'createdAt',
      render: (value) => new Date(String(value)).toLocaleString(),
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      accessor: 'expiresAt',
      render: (value) => value ? new Date(String(value)).toLocaleDateString() : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, item) => {
        const isRevoked = !!item.revokedAt;
        return !isRevoked ? (
          <button
            className="btn btn-sm btn-outline btn-error"
            onClick={async () => {
              try {
                await revokeApiKey(item.id);
                setApiKeys(await fetchApiKeys());
              } catch (err) {
                setApiError((err as Error).message || 'Failed to revoke key');
              }
            }}
          >
            Revoke
          </button>
        ) : null;
      },
    },
  ];



  // Contributions table columns
  const contributionsColumns: Column<Contribution>[] = [
    {
      key: 'id',
      header: 'ID',
      accessor: 'id',
    },
    {
      key: 'vehicleData',
      header: 'Vehicle Data',
      accessor: 'vehicleData',
      render: (value) => <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>,
    },
    {
      key: 'changeType',
      header: 'Change',
      render: (_, contribution) => {
        return 'changeType' in contribution ? (contribution as { changeType: string }).changeType : 'NEW';
      },
    },
    {
      key: 'votes',
      header: 'Votes',
      accessor: 'votes',
      render: (value) => String(value || 0),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      render: (value) => {
        const badgeClass =
          value === 'PENDING' ? 'badge-warning' :
          value === 'APPROVED' ? 'badge-success' :
          value === 'REJECTED' ? 'badge-error' :
          value === 'CANCELLED' ? 'badge-neutral' : 'badge-ghost';
        return <span className={`badge ${badgeClass}`}>{String(value)}</span>;
      },
    },
    {
      key: 'createdAt',
      header: 'Submitted At',
      accessor: 'createdAt',
      render: (value) => new Date(String(value)).toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, contribution) => {
        return contribution.status === 'PENDING' ? (
          <button
            className="btn btn-outline btn-error btn-sm"
            onClick={async () => {
              try {
                await cancelMyContribution(contribution.id);
                loadMyContributions();
              } catch (err) {
                setError((err as Error).message || 'Failed to cancel contribution.');
              }
            }}
          >
            Cancel
          </button>
        ) : null;
      },
    },
  ];

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <span>Please log in to view your dashboard.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-6">{user?.email}'s Dashboard</h2>
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4">
          <span>{success}</span>
        </div>
      )}

      <div className="stats shadow mb-6">
        <div className="stat">
          <div className="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div className="stat-title">Your App Currency Balance</div>
          <div className="stat-value text-primary">{user?.appCurrencyBalance || 0}</div>
          <div className="stat-desc">
            Credits earned from approved contributions. Vote on others to help moderation.
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Your API Keys</h2>
          {apiError && (
            <div className="alert alert-error mb-4">
              <span>{apiError}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-4">
            <input id="key-name" className="input input-bordered w-full max-w-xs" placeholder="Name (optional)" />
            <input id="key-expiry" className="input input-bordered w-full max-w-xs" placeholder="Expires At (YYYY-MM-DD optional)" />
            <button
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  const name = (document.getElementById('key-name') as HTMLInputElement)?.value || undefined;
                  const expiresRaw = (document.getElementById('key-expiry') as HTMLInputElement)?.value || undefined;
                  const expiresAt = expiresRaw ? new Date(expiresRaw).toISOString() : undefined;
                  const { apiKey } = await createApiKey(name, expiresAt);
                  setApiKeys(await fetchApiKeys());
                  alert(`New API key created: ${apiKey}`);
                } catch (err) {
                  setApiError((err as Error).message || 'Failed to create API key');
                }
              }}
            >
              Generate API Key
            </button>
          </div>
          <DataTable<ApiKey>
            data={apiKeys}
            columns={apiKeysColumns}
            emptyMessage="No API keys yet."
            size="sm"
            zebra={false}
          />
        </div>
      </div>

      {/* API Usage Chart */}
      <ApiUsageChart
        apiKeys={apiKeys}
        dailyUsage={dailyUsage}
        dailyUsagePerKey={dailyUsagePerKey}
        onViewHistory={() => setShowHistoryModal(true)}
      />

      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">Submit a New Vehicle Contribution</h2>
          <p className="text-gray-600 mb-4">
            Help us grow the EV database by submitting new vehicle data.

            Rules and tips:
          </p>
          <ul className="list-disc list-inside mb-4">
            <li>Include make, model, and year. Add battery, range and charge speed if known.</li>
            <li>Only factual data; no marketing claims.</li>
            <li>Duplicates may be rejected. Search first.</li>
            <li>Edits to existing entries should be submitted with corrected values.</li>
          </ul>
          <div className="text-sm text-gray-500 mb-4">
            Approved submissions grant credits; rejected ones do not. Moderators may request additional info.
          </div>
          <button className="btn btn-primary" onClick={handleShowContributionModal}>
            Submit Contribution
          </button>
        </div>
      </div>

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Your Contributions</h2>
          <DataTable<Contribution>
            data={myContributions}
            columns={contributionsColumns}
            loading={loadingContributions}
            emptyMessage="You have not submitted any contributions yet."
            zebra={true}
          />
        </div>
      </div>

      <dialog className={`modal ${showContributionModal ? 'modal-open' : ''}`}>
        <div className="modal-box w-11/12 max-w-5xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Submit New Vehicle Contribution</h3>
            <button className="btn btn-sm btn-circle btn-ghost" onClick={handleCloseContributionModal}>✕</button>
          </div>
          <ContributionForm onSubmit={handleSubmitContribution} onCancel={handleCloseContributionModal} />
        </div>
      </dialog>

      {/* API Usage History Modal */}
      <ApiUsageHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        apiKeys={apiKeys}
        dailyUsage={dailyUsage}
        dailyUsagePerKey={dailyUsagePerKey}
      />
    </div>
  );
};

export default UserDashboardPage;
