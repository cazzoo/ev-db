import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkMaintenanceMode } from '../services/api';
import { WrenchScrewdriverIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MaintenanceModeProps {
  children: React.ReactNode;
}

const MaintenanceMode = ({ children }: MaintenanceModeProps) => {
  const { user } = useAuth();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const { isMaintenanceMode } = await checkMaintenanceMode();
        setIsMaintenanceMode(isMaintenanceMode);
      } catch (error) {
        console.error('Failed to check maintenance mode:', error);
        // If we can't check, assume maintenance mode is off
        setIsMaintenanceMode(false);
      } finally {
        setLoading(false);
      }
    };

    checkMaintenance();

    // Check maintenance mode every 30 seconds
    const interval = setInterval(checkMaintenance, 30000);

    return () => clearInterval(interval);
  }, []);

  // Show loading state while checking maintenance mode
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  // If maintenance mode is off, or user is admin/moderator, show normal content
  if (!isMaintenanceMode || user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
    return <>{children}</>;
  }

  // Show maintenance mode message for regular users
  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <div className="flex justify-center mb-4">
              <WrenchScrewdriverIcon className="h-16 w-16 text-warning" />
            </div>
            
            <h1 className="card-title text-2xl justify-center mb-2">
              System Under Maintenance
            </h1>
            
            <p className="text-base-content/70 mb-6">
              We're currently performing maintenance to improve your experience. 
              The system will be back online shortly.
            </p>

            <div className="alert alert-warning">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span className="text-sm">
                The contribution system is temporarily unavailable. 
                You can still browse vehicles and view existing content.
              </span>
            </div>

            <div className="mt-6">
              <p className="text-sm text-base-content/60">
                Thank you for your patience.
              </p>
            </div>

            <div className="card-actions justify-center mt-4">
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => window.location.reload()}
              >
                Check Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceMode;
