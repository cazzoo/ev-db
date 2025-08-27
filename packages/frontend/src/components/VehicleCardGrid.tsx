import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Vehicle, Contribution, Pagination } from '../services/api';
import { Grid } from '../design-system/components/Layout';
import VehicleCard from './VehicleCard';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';

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
  pagination,
  onPageChange
}) => {
  // No client-side filtering since we're using server-side pagination
  const filteredVehicles = vehicles;

  // Refs for keyboard navigation
  const gridRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Track actual grid layout dimensions
  const [gridDimensions, setGridDimensions] = useState({
    columns: 2,
    rows: 0,
    totalItems: 0
  });

  // Calculate actual grid dimensions by measuring the rendered layout
  const calculateGridDimensions = useCallback(() => {
    if (!gridRef.current || filteredVehicles.length === 0) {
      return { columns: 2, rows: 0, totalItems: 0 };
    }

    // Get all card elements
    const cards = gridRef.current.querySelectorAll('[data-card-index]');
    if (cards.length === 0) {
      return { columns: 2, rows: 0, totalItems: 0 };
    }

    // Get the position of the first few cards to determine columns
    const firstCard = cards[0] as HTMLElement;
    const firstCardTop = firstCard.offsetTop;

    let columns = 1;

    // Count how many cards are on the same row as the first card
    for (let i = 1; i < Math.min(cards.length, 10); i++) {
      const card = cards[i] as HTMLElement;
      const cardTop = card.offsetTop;

      // If this card is on the same row (within a small tolerance)
      if (Math.abs(cardTop - firstCardTop) < 10) {
        columns++;
      } else {
        // We've reached the next row
        break;
      }
    }

    const totalItems = filteredVehicles.length;
    const rows = Math.ceil(totalItems / columns);

    return { columns, rows, totalItems };
  }, [filteredVehicles.length]);

  // Update grid dimensions when layout changes
  useEffect(() => {
    const updateDimensions = () => {
      const newDimensions = calculateGridDimensions();

      if (newDimensions.columns !== gridDimensions.columns ||
          newDimensions.totalItems !== gridDimensions.totalItems) {
        console.log(`Grid dimensions updated:`, {
          from: gridDimensions,
          to: newDimensions,
          windowWidth: window.innerWidth
        });
        setGridDimensions(newDimensions);
      }
    };

    // Update dimensions after layout changes with multiple attempts
    // This ensures we catch the layout after CSS grid has settled
    const timeouts = [
      setTimeout(updateDimensions, 50),
      setTimeout(updateDimensions, 150),
      setTimeout(updateDimensions, 300)
    ];

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [filteredVehicles.length, calculateGridDimensions, gridDimensions]);

  // Separate effect for window resize
  useEffect(() => {
    const handleResize = () => {
      // Debounce resize events
      const timeoutId = setTimeout(() => {
        const newDimensions = calculateGridDimensions();
        if (newDimensions.columns !== gridDimensions.columns) {
          console.log(`Grid dimensions updated on resize:`, {
            from: gridDimensions,
            to: newDimensions,
            windowWidth: window.innerWidth
          });
          setGridDimensions(newDimensions);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateGridDimensions, gridDimensions]);

  // Keyboard navigation hook with measured grid dimensions
  const navigationConfig = {
    itemCount: filteredVehicles.length,
    wrap: true,
    enabled: !loading && !error && filteredVehicles.length > 0,
    gridColumns: gridDimensions.columns,
    initialIndex: 0, // Start with first item ready to be focused
    onSelect: (index: number) => {
      // Default action is to view the vehicle
      if (onView && filteredVehicles[index]) {
        onView(filteredVehicles[index]);
      }
    },
    onEscape: () => {
      // Remove focus from grid when escaping
      gridRef.current?.blur();
    }
  };

  console.log('Navigation config:', {
    ...navigationConfig,
    gridDimensions,
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 'SSR'
  });

  const {
    focusedIndex,
    isActive,
    handleKeyDown,
    reset,
    activate
  } = useKeyboardNavigation(navigationConfig);

  // Update card refs array when vehicles change
  useEffect(() => {
    cardRefs.current = cardRefs.current.slice(0, filteredVehicles.length);
  }, [filteredVehicles.length]);

  // Focus management - focus the appropriate card when focusedIndex changes
  useEffect(() => {
    console.log(`Focus management: isActive=${isActive}, focusedIndex=${focusedIndex}, cardRefs.length=${cardRefs.current.length}`);
    if (isActive && focusedIndex >= 0 && focusedIndex < cardRefs.current.length) {
      const cardElement = cardRefs.current[focusedIndex];
      if (cardElement) {
        console.log(`Focusing card at index ${focusedIndex}`);
        cardElement.focus();
        cardElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      } else {
        console.log(`Card element at index ${focusedIndex} not found`);
      }
    }
  }, [focusedIndex, isActive]);

  // Reset navigation when vehicles change (e.g., new search, pagination)
  useEffect(() => {
    reset();
  }, [vehicles, reset]);

  // Explicitly activate navigation when vehicles are loaded
  useEffect(() => {
    if (!loading && !error && filteredVehicles.length > 0 && !isActive) {
      console.log('Explicitly activating navigation after vehicles loaded');
      activate();
    }
  }, [loading, error, filteredVehicles.length, isActive, activate]);

  // Auto-focus the grid when vehicles are loaded and navigation becomes active
  useEffect(() => {
    console.log(`Auto-focus check: isActive=${isActive}, focusedIndex=${focusedIndex}, loading=${loading}, error=${error}, vehicles=${filteredVehicles.length}`);
    if (isActive && focusedIndex === 0 && gridRef.current && !loading && !error && filteredVehicles.length > 0) {
      console.log('Auto-focusing grid');
      // Focus the grid to establish keyboard context
      // The focus management effect will then focus the first card
      gridRef.current.focus();
    }
  }, [isActive, focusedIndex, loading, error, filteredVehicles.length]);



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
        ref={gridRef}
        cols={{ sm: 2, md: 3, lg: 4, xl: 5 }}
        gap="md"
        className="w-full focus:outline-none"
        role="grid"
        aria-label={`Vehicle grid showing ${filteredVehicles.length} vehicles. Use arrow keys to navigate, Enter or Space to select, Escape to exit navigation.`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // When grid receives focus, activate keyboard navigation if not already active
          if (!isActive && filteredVehicles.length > 0) {
            activate(); // This will focus the first item (index 0)
          }
        }}
      >
        {filteredVehicles.map((vehicle, index) => (
          <VehicleCard
            key={vehicle.id}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            vehicle={vehicle}
            onEdit={onEdit}
            onView={onView}
            onProposeUpdate={onProposeUpdate}
            onProposeVariant={onProposeVariant}
            userRole={userRole}
            pendingContributions={pendingContributions}
            isAuthenticated={isAuthenticated}
            showActions={true}
            // Keyboard navigation props
            isFocused={isActive && focusedIndex === index}
            tabIndex={-1} // Remove from tab order, navigation handled by grid
            role="gridcell"
            aria-selected={isActive && focusedIndex === index}
            data-card-index={index}
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
