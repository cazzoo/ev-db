import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Contribution {
  id: number;
  userId: number;
  userEmail: string;
  vehicleData: any;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  changeType: 'NEW' | 'UPDATE' | 'DELETE';
  targetVehicleId?: number;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  upvotes: number;
  downvotes: number;
  userVote?: number;
}

const ContributionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContribution = async () => {
      if (!id) {
        setError('Invalid contribution ID');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/contributions/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Contribution not found');
          } else {
            const errorData = await response.json();
            setError(errorData.error || 'Failed to fetch contribution');
          }
          return;
        }

        const data = await response.json();
        setContribution(data);
      } catch (err) {
        setError('Failed to fetch contribution details');
        console.error('Error fetching contribution:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContribution();
  }, [id]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { class: 'badge-warning', text: 'Pending Review' },
      APPROVED: { class: 'badge-success', text: 'Approved' },
      REJECTED: { class: 'badge-error', text: 'Rejected' },
      CANCELLED: { class: 'badge-neutral', text: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    return <div className={`badge ${config.class}`}>{config.text}</div>;
  };

  const getChangeTypeBadge = (changeType: string, contribution?: Contribution) => {
    // For NEW contributions, we need to determine if it's truly new or a variant
    if (changeType === 'NEW' && contribution) {
      // This is a simplified check - in a full implementation, you'd want to
      // check if there are existing vehicles with same make/model/similar year
      const isVariant = false; // TODO: Implement proper variant detection

      return (
        <div className={`badge ${isVariant ? 'badge-success' : 'badge-primary'}`}>
          {isVariant ? 'Variant' : 'New Vehicle'}
        </div>
      );
    }

    const typeConfig = {
      UPDATE: { class: 'badge-info', text: 'Update' },
      DELETE: { class: 'badge-error', text: 'Delete' },
    };

    const config = typeConfig[changeType as keyof typeof typeConfig];
    if (config) {
      return <div className={`badge ${config.class}`}>{config.text}</div>;
    }

    // Fallback for unknown types
    return <div className="badge badge-neutral">{changeType}</div>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold mb-2">Error</h2>
        <p className="text-base-content/70 mb-6">{error}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate('/contributions/browse')}
            className="btn btn-primary"
          >
            Browse Contributions
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!contribution) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold mb-2">Contribution Not Found</h2>
        <p className="text-base-content/70 mb-6">
          The contribution you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <button
          onClick={() => navigate('/contributions/browse')}
          className="btn btn-primary"
        >
          Browse Contributions
        </button>
      </div>
    );
  }

  const vehicleData = typeof contribution.vehicleData === 'string'
    ? JSON.parse(contribution.vehicleData)
    : contribution.vehicleData;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Contribution #{contribution.id}</h1>
          <p className="text-base-content/70">
            Submitted by {contribution.userEmail} on {formatDate(contribution.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(contribution.status)}
          {getChangeTypeBadge(contribution.changeType, contribution)}
        </div>
      </div>

      {/* Status Timeline */}
      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg">Status Timeline</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <div>
                <span className="font-medium">Submitted</span>
                <span className="text-sm text-base-content/70 ml-2">
                  {formatDate(contribution.createdAt)}
                </span>
              </div>
            </div>

            {contribution.approvedAt && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-success rounded-full"></div>
                <div>
                  <span className="font-medium text-success">Approved</span>
                  <span className="text-sm text-base-content/70 ml-2">
                    {formatDate(contribution.approvedAt)}
                  </span>
                </div>
              </div>
            )}

            {contribution.rejectedAt && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-error rounded-full"></div>
                <div>
                  <span className="font-medium text-error">Rejected</span>
                  <span className="text-sm text-base-content/70 ml-2">
                    {formatDate(contribution.rejectedAt)}
                  </span>
                </div>
              </div>
            )}

            {contribution.cancelledAt && (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-neutral rounded-full"></div>
                <div>
                  <span className="font-medium text-neutral">Cancelled</span>
                  <span className="text-sm text-base-content/70 ml-2">
                    {formatDate(contribution.cancelledAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Data */}
      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg">Vehicle Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <span className="label-text font-medium">Make</span>
              </label>
              <div className="text-lg">{vehicleData.make || 'N/A'}</div>
            </div>
            <div>
              <label className="label">
                <span className="label-text font-medium">Model</span>
              </label>
              <div className="text-lg">{vehicleData.model || 'N/A'}</div>
            </div>
            <div>
              <label className="label">
                <span className="label-text font-medium">Year</span>
              </label>
              <div className="text-lg">{vehicleData.year || 'N/A'}</div>
            </div>
            <div>
              <label className="label">
                <span className="label-text font-medium">Battery Capacity</span>
              </label>
              <div className="text-lg">
                {vehicleData.batteryCapacity ? `${vehicleData.batteryCapacity} kWh` : 'N/A'}
              </div>
            </div>
            <div>
              <label className="label">
                <span className="label-text font-medium">Range</span>
              </label>
              <div className="text-lg">
                {vehicleData.range ? `${vehicleData.range} km` : 'N/A'}
              </div>
            </div>
            <div>
              <label className="label">
                <span className="label-text font-medium">Charging Speed</span>
              </label>
              <div className="text-lg">
                {vehicleData.chargingSpeed ? `${vehicleData.chargingSpeed} kW` : 'N/A'}
              </div>
            </div>
          </div>

          {vehicleData.description && (
            <div className="mt-4">
              <label className="label">
                <span className="label-text font-medium">Description</span>
              </label>
              <div className="text-base-content/80">{vehicleData.description}</div>
            </div>
          )}
        </div>
      </div>

      {/* Community Feedback */}
      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg">Community Feedback</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👍</span>
              <span className="text-lg font-medium">{contribution.upvotes}</span>
              <span className="text-sm text-base-content/70">upvotes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">👎</span>
              <span className="text-lg font-medium">{contribution.downvotes}</span>
              <span className="text-sm text-base-content/70">downvotes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => navigate('/contributions/browse')}
          className="btn btn-primary"
        >
          Browse More Contributions
        </button>
        {user?.userId === contribution.userId && (
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost"
          >
            My Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default ContributionDetailPage;
