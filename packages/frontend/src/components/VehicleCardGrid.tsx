import React from 'react';
import { Vehicle, Contribution, Pagination } from '../services/api';
import { Grid } from '../design-system/components/Layout';
import VehicleCard from './VehicleCard';

interface VehicleCardGridProps {
  vehicles: Vehicle[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onEdit?: (vehicle: Vehicle) => void;
  onView?: (vehicle: Vehicle) => void;
  onProposeUpdate?: (vehicle: Vehicle) => void;
  onProposeVariant?: (vehicle: Vehicle) => void;
  userRole?: string;
  pendingContributions?: Contribution[];
  isAuthenticated?: boolean;
  searchQuery?: string;
  searchFields?: (keyof Vehicle)[];
  // Pagination props
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
}

// Loading skeleton card component
const VehicleCardSkeleton: React.FC = () => (
  <div className="card bg-base-100 shadow-md border border-base-300 h-full">
    {/* Image skeleton */}
    <figure className="h-32 bg-gradient-to-br from-base-300 to-base-200 animate-pulse flex items-center justify-center">
      <div className="text-base-content/30 text-xl">🚗</div>
    </figure>

    {/* Header skeleton */}
    <div className="card-body pb-3">
      <div className="space-y-1">
        <div className="h-4 bg-base-300 rounded animate-pulse"></div>
        <div className="h-3 bg-base-300 rounded w-3/4 animate-pulse"></div>
      </div>

      {/* Specs skeleton */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 bg-base-300 rounded w-8 animate-pulse"></div>
            <div className="h-3 bg-base-300 rounded w-10 animate-pulse"></div>
          </div>
        ))}
      </div>

      {/* Footer skeleton */}
      <div className="card-actions justify-end mt-2 pt-2 border-t border-base-300">
        <div className="flex flex-col gap-1 w-full">
          <div className="flex gap-1 w-full">
            <div className="h-7 bg-base-300 rounded flex-1 animate-pulse"></div>
            <div className="h-7 bg-base-300 rounded flex-1 animate-pulse"></div>
          </div>
          <div className="flex gap-1 w-full">
            <div className="h-7 bg-base-300 rounded flex-1 animate-pulse"></div>
            <div className="h-7 bg-base-300 rounded flex-1 animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const VehicleCardGrid: React.FC<VehicleCardGridProps> = ({
  vehicles,
  loading = false,
  error = null,
  emptyMessage = "No vehicles found.",
  onEdit,
  onView,
  onProposeUpdate,
  onProposeVariant,
  userRole,
  pendingContributions = [],
  isAuthenticated = false,
  searchQuery = '',
  searchFields = ['make', 'model'],
  pagination,
  onPageChange
}) => {
  // No client-side filtering since we're using server-side pagination
  const filteredVehicles = vehicles;

  // Show loading state
  if (loading) {
    return (
      <div role="status" aria-label="Loading vehicles">
        <Grid
          cols={{ sm: 2, md: 3, lg: 4, xl: 5 }}
          gap="md"
          className="w-full"
        >
          {[...Array(8)].map((_, index) => (
            <VehicleCardSkeleton key={index} />
          ))}
        </Grid>
        <span className="sr-only">Loading vehicle data...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12" role="alert">
        <div className="alert alert-error max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // Show empty state
  if (filteredVehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-base-content/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-base-content">
            {searchQuery ? 'No vehicles match your search' : emptyMessage}
          </h3>
          {searchQuery && (
            <p className="mt-1 text-sm text-base-content/60">
              Try adjusting your search terms or browse all vehicles.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show vehicles grid
  return (
    <div className="w-full">
      {/* Results count */}
      {searchQuery && (
        <div className="mb-4 text-sm text-base-content/70">
          Found {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Vehicle cards grid */}
      <Grid
        cols={{ sm: 2, md: 3, lg: 4, xl: 5 }}
        gap="md"
        className="w-full"
        role="grid"
        aria-label={`Vehicle grid showing ${filteredVehicles.length} vehicles`}
      >
        {filteredVehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            onEdit={onEdit}
            onView={onView}
            onProposeUpdate={onProposeUpdate}
            onProposeVariant={onProposeVariant}
            userRole={userRole}
            pendingContributions={pendingContributions}
            isAuthenticated={isAuthenticated}
            showActions={true}
          />
        ))}
      </Grid>

      {/* Pagination controls */}
      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex justify-center mt-6">
          <div className="btn-group">
            <button
              className="btn btn-outline"
              onClick={() => onPageChange(1)}
              disabled={pagination.page === 1}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page numbers */}
            {[...Array(Math.min(5, pagination.totalPages)).keys()].map(i => {
              const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, pagination.page - 2)) + i;
              if (pageNum > pagination.totalPages) return null;
              return (
                <button
                  key={pageNum}
                  className={`btn ${pageNum === pagination.page ? 'btn-active' : 'btn-outline'}`}
                  onClick={() => onPageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              className="btn btn-outline"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              className="btn btn-outline"
              onClick={() => onPageChange(pagination.totalPages)}
              disabled={pagination.page === pagination.totalPages}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Pagination info */}
      {pagination && (
        <div className="text-center text-sm text-base-content/70 mt-4">
          Showing {filteredVehicles.length > 0 ? ((pagination.page - 1) * pagination.limit + 1) : 0} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} vehicles
        </div>
      )}
    </div>
  );
};

export default VehicleCardGrid;
