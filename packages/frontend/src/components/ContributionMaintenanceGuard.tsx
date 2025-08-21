import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkMaintenanceMode } from '../services/api';
import { WrenchScrewdriverIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ContributionMaintenanceGuardProps {
  children: React.ReactNode;
  fallbackContent?: React.ReactNode;
}

const ContributionMaintenanceGuard = ({ children, fallbackContent }: ContributionMaintenanceGuardProps) => {
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
      <div className="flex items-center justify-center p-8">
        <div className="loading loading-spinner loading-md"></div>
      </div>
    );
  }

  // If maintenance mode is off, or user is admin/moderator, show normal content
  if (!isMaintenanceMode || user?.role === 'ADMIN' || user?.role === 'MODERATOR') {
    return <>{children}</>;
  }

  // Show fallback content if provided, otherwise show maintenance message
  if (fallbackContent) {
    return (
      <>
        <div className="alert alert-warning mb-6">
          <WrenchScrewdriverIcon className="h-5 w-5" />
          <div>
            <h3 className="font-bold">Contribution System Under Maintenance</h3>
            <div className="text-sm">
              The contribution system is temporarily unavailable. You can still browse existing content.
            </div>
          </div>
        </div>
        {fallbackContent}
      </>
    );
  }

  // Default maintenance message for contribution features
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body text-center">
        <div className="flex justify-center mb-4">
          <WrenchScrewdriverIcon className="h-12 w-12 text-warning" />
        </div>
        
        <h2 className="card-title text-xl justify-center mb-2">
          Contribution System Under Maintenance
        </h2>
        
        <p className="text-base-content/70 mb-4">
          The contribution system is temporarily unavailable while we perform maintenance.
        </p>

        <div className="alert alert-info">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span className="text-sm">
            You can still browse vehicles and view existing contributions. 
            Submitting new contributions and voting is temporarily disabled.
          </span>
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
  );
};

export default ContributionMaintenanceGuard;
