import { useState, useEffect } from 'react';
import { TrashIcon, ExclamationTriangleIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { wipeAllVehicles, wipeAllContributions, cleanupOrphanedContributions } from '../services/api';

interface DevAdminActionsProps {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

const DevAdminActions = ({ onSuccess, onError }: DevAdminActionsProps) => {
  const [isWipingVehicles, setIsWipingVehicles] = useState(false);
  const [isWipingContributions, setIsWipingContributions] = useState(false);
  const [isCleaningOrphaned, setIsCleaningOrphaned] = useState(false);
  const [showVehicleConfirm, setShowVehicleConfirm] = useState(false);
  const [showContributionConfirm, setShowContributionConfirm] = useState(false);

  // Check if we're in development mode
  const isDevelopment = (import.meta as { env: { MODE: string } }).env?.MODE === 'development';

  // Handle escape key for vehicle confirmation modal
  useEffect(() => {
    if (!showVehicleConfirm) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowVehicleConfirm(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showVehicleConfirm]);

  // Handle escape key for contribution confirmation modal
  useEffect(() => {
    if (!showContributionConfirm) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowContributionConfirm(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showContributionConfirm]);

  if (!isDevelopment) {
    return null; // Don't render anything in production
  }

  const handleWipeVehicles = async () => {
    setIsWipingVehicles(true);
    try {
      const result = await wipeAllVehicles();
      onSuccess?.(result.message);
      setShowVehicleConfirm(false);
    } catch (error) {
      onError?.((error as Error).message);
    } finally {
      setIsWipingVehicles(false);
    }
  };

  const handleWipeContributions = async () => {
    setIsWipingContributions(true);
    try {
      const result = await wipeAllContributions();
      onSuccess?.(result.message);
      setShowContributionConfirm(false);
    } catch (error) {
      onError?.((error as Error).message);
    } finally {
      setIsWipingContributions(false);
    }
  };

  const handleCleanupOrphaned = async () => {
    setIsCleaningOrphaned(true);
    try {
      const result = await cleanupOrphanedContributions();
      onSuccess?.(result.message);
    } catch (error) {
      onError?.((error as Error).message);
    } finally {
      setIsCleaningOrphaned(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl border-2 border-warning">
      <div className="card-body">
        <h2 className="card-title text-warning">
          <ExclamationTriangleIcon className="h-6 w-6" />
          Development Actions
        </h2>
        <div className="alert alert-warning">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>These actions are only available in development mode and will permanently delete data!</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <button
            className="btn btn-error btn-outline"
            onClick={() => setShowVehicleConfirm(true)}
            disabled={isWipingVehicles}
          >
            <TrashIcon className="h-5 w-5" />
            {isWipingVehicles ? 'Wiping...' : 'Wipe All Vehicles'}
          </button>

          <button
            className="btn btn-error btn-outline"
            onClick={() => setShowContributionConfirm(true)}
            disabled={isWipingContributions}
          >
            <TrashIcon className="h-5 w-5" />
            {isWipingContributions ? 'Wiping...' : 'Wipe All Contributions'}
          </button>

          <button
            className="btn btn-warning btn-outline"
            onClick={handleCleanupOrphaned}
            disabled={isCleaningOrphaned}
            title="Remove contributions that reference deleted vehicles"
          >
            <WrenchScrewdriverIcon className="h-5 w-5" />
            {isCleaningOrphaned ? 'Cleaning...' : 'Cleanup Orphaned'}
          </button>
        </div>
      </div>

      {/* Vehicle Confirmation Modal */}
      {showVehicleConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">Confirm Vehicle Wipe</h3>
            <p className="py-4">
              Are you sure you want to delete ALL vehicles from the database?
              This action cannot be undone and will permanently remove all vehicle data.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowVehicleConfirm(false)}
                disabled={isWipingVehicles}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleWipeVehicles}
                disabled={isWipingVehicles}
              >
                {isWipingVehicles ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Wiping...
                  </>
                ) : (
                  'Yes, Wipe All Vehicles'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Confirmation Modal */}
      {showContributionConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg text-error">Confirm Contribution Wipe</h3>
            <p className="py-4">
              Are you sure you want to delete ALL contributions from the database?
              This action cannot be undone and will permanently remove all contribution data and reviews.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setShowContributionConfirm(false)}
                disabled={isWipingContributions}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={handleWipeContributions}
                disabled={isWipingContributions}
              >
                {isWipingContributions ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Wiping...
                  </>
                ) : (
                  'Yes, Wipe All Contributions'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevAdminActions;
