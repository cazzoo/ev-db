import React from 'react';
import { Link } from 'react-router-dom';
import { Vehicle, Contribution } from '../services/api';
import VehicleCard from './VehicleCard';
import VehicleSpotlightCarousel from './VehicleSpotlightCarousel';

interface SpotlightSectionProps {
  title: string;
  items: (Vehicle | Contribution)[];
  type: 'vehicles' | 'contributions';
  loading?: boolean;
  error?: string | null;
  viewAllLink?: string;
  className?: string;
  onContributionClick?: (contribution: Contribution) => void;
  onVehicleClick?: (vehicle: Vehicle) => void;
}

const SpotlightSection: React.FC<SpotlightSectionProps> = ({
  title,
  items,
  type,
  loading = false,
  error = null,
  viewAllLink,
  className = '',
  onContributionClick,
  onVehicleClick
}) => {
  if (loading) {
    return (
      <section className={`mb-8 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          {viewAllLink && (
            <Link to={viewAllLink} className="btn btn-outline btn-sm">
              View All
            </Link>
          )}
        </div>
        {type === 'vehicles' ? (
          <div className="w-full h-96 bg-base-200 rounded-2xl animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="h-8 bg-base-300 rounded w-48 mb-4 mx-auto"></div>
              <div className="h-6 bg-base-300 rounded w-32 mb-6 mx-auto"></div>
              <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="text-center">
                    <div className="h-4 bg-base-300 rounded w-full mb-1"></div>
                    <div className="h-3 bg-base-300 rounded w-3/4 mx-auto"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="card bg-base-100 shadow-xl animate-pulse">
                <div className="card-body">
                  <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-base-300 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-base-300 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (error) {
    return (
      <section className={`mb-8 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          {viewAllLink && (
            <Link to={viewAllLink} className="btn btn-outline btn-sm">
              View All
            </Link>
          )}
        </div>
        <div className="alert alert-error">
          <span>Failed to load {type}: {error}</span>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className={`mb-8 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          {viewAllLink && (
            <Link to={viewAllLink} className="btn btn-outline btn-sm">
              View All
            </Link>
          )}
        </div>
        <div className={`text-center text-base-content/70 ${type === 'vehicles' ? 'py-24' : 'py-8'}`}>
          No recent {type} to display.
        </div>
      </section>
    );
  }

  return (
    <section className={`mb-8 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        {viewAllLink && (
          <Link to={viewAllLink} className="btn btn-outline btn-sm">
            View All
          </Link>
        )}
      </div>

      {type === 'vehicles' ? (
        <VehicleSpotlightCarousel
          vehicles={items as Vehicle[]}
          onVehicleClick={onVehicleClick}
          autoPlay={true}
          autoPlayInterval={6000}
          className="w-full"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(items as Contribution[]).map((contribution) => (
            <div key={contribution.id} className="card bg-base-100 shadow-xl relative">
              {contribution.isNew && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="badge badge-accent badge-sm font-bold">NEW</span>
                </div>
              )}
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="card-title text-sm">
                    {contribution.changeType === 'NEW' ? 'New Vehicle' : 'Update Proposal'}
                  </h3>
                  <div className={`badge badge-sm ${
                    contribution.status === 'PENDING' ? 'badge-warning' :
                    contribution.status === 'APPROVED' ? 'badge-success' :
                    contribution.status === 'REJECTED' ? 'badge-error' :
                    'badge-neutral'
                  }`}>
                    {contribution.status}
                  </div>
                </div>

                <div className="text-sm">
                  <p className="font-semibold">
                    {contribution.vehicleData.make} {contribution.vehicleData.model} ({contribution.vehicleData.year})
                  </p>
                  <p className="text-base-content/70 text-xs">
                    By: {contribution.userEmail || 'Unknown User'}
                  </p>
                  <p className="text-base-content/70 text-xs">
                    {new Date(contribution.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="card-actions justify-end mt-2">
                  {onContributionClick ? (
                    <button
                      onClick={() => onContributionClick(contribution)}
                      className="btn btn-outline btn-xs"
                    >
                      View Details
                    </button>
                  ) : (
                    <Link
                      to={`/contributions/browse`}
                      className="btn btn-outline btn-xs"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default SpotlightSection;
