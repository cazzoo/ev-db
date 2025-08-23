import React, { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { Vehicle, Contribution } from '../services/api';
import { Card, CardHeader, CardBody, CardFooter } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import VehicleImageCarousel from './VehicleImageCarousel';
import { Link } from 'react-router-dom';

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit?: (vehicle: Vehicle) => void;
  onView?: (vehicle: Vehicle) => void;
  onProposeUpdate?: (vehicle: Vehicle) => void;
  onProposeVariant?: (vehicle: Vehicle) => void;
  showActions?: boolean;
  userRole?: string;
  pendingContributions?: Contribution[];
  isAuthenticated?: boolean;
  // Keyboard navigation props
  isFocused?: boolean;
  tabIndex?: number;
  role?: string;
  'aria-selected'?: boolean;
  'data-card-index'?: number;
}

const VehicleCard = forwardRef<HTMLDivElement, VehicleCardProps>(({
  vehicle,
  onEdit,
  onView,
  onProposeUpdate,
  onProposeVariant,
  showActions = true,
  userRole,
  pendingContributions = [],
  isAuthenticated = false,
  isFocused = false,
  tabIndex = 0,
  role = "button",
  'aria-selected': ariaSelected = false,
  'data-card-index': dataCardIndex
}, ref) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Expose the card element to parent components
  useImperativeHandle(ref, () => cardRef.current!, []);

  // Handle focus styling when focused via keyboard navigation
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.focus();
    }
  }, [isFocused]);


  const handleCardClick = () => {
    if (onView) {
      onView(vehicle);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking edit button
    if (onEdit) {
      onEdit(vehicle);
    }
  };

  const handleProposeUpdateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onProposeUpdate) {
      onProposeUpdate(vehicle);
    }
  };

  const handleProposeVariantClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onProposeVariant) {
      onProposeVariant(vehicle);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only handle Enter/Space when this card has focus
    // Arrow keys are handled by the parent grid component
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling to grid
      handleCardClick();
    }
    // Tab key should move focus to interactive elements within the card
    else if (e.key === 'Tab') {
      // Allow default tab behavior for navigating within card
      // The first focusable element will be the first button
    }
  };

  // Calculate pending proposals for this vehicle
  const pendingUpdateProposals = pendingContributions.filter(
    c => c.changeType === 'UPDATE' && c.targetVehicleId === vehicle.id
  );
  const pendingVariants = pendingContributions.filter(
    c => c.changeType === 'NEW' &&
    c.vehicleData.make.toLowerCase() === vehicle.make.toLowerCase() &&
    c.vehicleData.model.toLowerCase() === vehicle.model.toLowerCase() &&
    Math.abs(c.vehicleData.year - vehicle.year) <= 2
  );

  const formatValue = (value: number | undefined, unit: string) => {
    return value ? `${value} ${unit}` : 'N/A';
  };

  return (
    <Card
      ref={cardRef}
      variant="default"
      size="md"
      hover
      interactive
      className={`h-full cursor-pointer transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        isFocused ? 'ring-2 ring-primary ring-offset-2 shadow-xl' : ''
      }`}
      onClick={handleCardClick}
      data-card-index={dataCardIndex}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex}
      role={role}
      aria-label={`View details for ${vehicle.make} ${vehicle.model} ${vehicle.year}`}
      aria-selected={ariaSelected}
    >
      {/* Vehicle Image Carousel */}
      <figure className="relative h-32 overflow-hidden">
        <VehicleImageCarousel
          images={vehicle.images?.map(img => ({
            id: img.id,
            url: img.url,
            altText: img.altText,
            caption: img.caption
          })) || []}
          vehicleMake={vehicle.make}
          vehicleModel={vehicle.model}
          vehicleYear={vehicle.year}
          className="w-full h-full"
          showIndicators={true}
          showNavigation={true}
          autoPlay={false}
        />
        {/* Year badge */}
        <div className="absolute top-3 right-3">
          <span className="badge badge-primary badge-lg font-semibold">
            {vehicle.year}
          </span>
        </div>
        {/* Price badge if available */}
        {vehicle.price && (
          <div className="absolute top-3 left-3">
            <span className="badge badge-success badge-lg font-semibold">
              ${vehicle.price.toLocaleString()}
            </span>
          </div>
        )}
      </figure>

      {/* Card Header - Ultra compact */}
      <CardHeader className="pb-0 pt-2 px-3">
        <h3 className="text-sm font-bold text-base-content line-clamp-1 leading-tight">
          {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-xs text-base-content/60 leading-tight">
          {vehicle.year}
        </p>
      </CardHeader>

      {/* Card Body - Ultra compact */}
      <CardBody className="pt-1 pb-1 px-3">
        <div className="space-y-1">
          {/* Key Specifications - Ultra compact */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs leading-tight">
            <div className="flex justify-between">
              <span className="text-base-content/60">Battery:</span>
              <span className="font-medium">{formatValue(vehicle.batteryCapacity, 'kWh')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Range:</span>
              <span className="font-medium">{formatValue(vehicle.range, 'km')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Charging:</span>
              <span className="font-medium">{formatValue(vehicle.chargingSpeed, 'kW')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-base-content/60">Speed:</span>
              <span className="font-medium">{formatValue(vehicle.topSpeed, 'km/h')}</span>
            </div>
          </div>

          {/* Additional specs if available - ultra compact */}
          {vehicle.acceleration && (
            <div className="flex justify-between items-center text-xs leading-tight">
              <span className="text-base-content/60">0-100:</span>
              <span className="font-medium">{vehicle.acceleration}s</span>
            </div>
          )}

          {/* Custom fields visible on card */}
          {vehicle.customFieldsArray && vehicle.customFieldsArray
            .filter(field => field.isVisibleOnCard && field.value !== null && field.value !== undefined && field.value !== '')
            .slice(0, 3) // Limit to 3 custom fields on card for space
            .map(field => {
              const displayValue = typeof field.value === 'boolean' ? (field.value ? 'Yes' : 'No') : String(field.value);
              return (
                <div key={field.key} className="flex justify-between items-center text-xs leading-tight">
                  <span className="text-base-content/60 truncate" title={field.name}>
                    {field.name.length > 12 ? field.name.substring(0, 12) + '...' : field.name}:
                  </span>
                  <span className="font-medium truncate ml-1" title={displayValue}>
                    {displayValue.length > 15 ? displayValue.substring(0, 15) + '...' : displayValue}
                  </span>
                </div>
              );
            })
          }
        </div>
      </CardBody>

      {/* Card Footer */}
      {showActions && (
        <CardFooter className="pt-1 pb-2 px-3 border-t border-base-300">
          {/* Pending proposals display */}
          {(pendingUpdateProposals.length > 0 || pendingVariants.length > 0) && (
            <div className="flex flex-wrap gap-1 mb-1">
              {pendingUpdateProposals.length > 0 && (
                <Link
                  to="/contributions/browse"
                  state={{ openContributionId: pendingUpdateProposals[0].id }}
                  className="badge badge-warning badge-sm hover:badge-warning-focus"
                  title={`View ${pendingUpdateProposals.length} update proposal(s) pending`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {pendingUpdateProposals.length > 1
                    ? `${pendingUpdateProposals.length} Updates Pending`
                    : '1 Update Pending'
                  }
                </Link>
              )}
              {pendingVariants.length > 0 && (
                <Link
                  to="/contributions/browse"
                  state={{ openContributionId: pendingVariants[0].id }}
                  className="badge badge-info badge-sm hover:badge-info-focus"
                  title={`View ${pendingVariants.length} variant proposal(s) pending`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {pendingVariants.length} Variant{pendingVariants.length > 1 ? 's' : ''} Pending
                </Link>
              )}
            </div>
          )}

          {/* Action buttons - Ultra compact */}
          <div className="flex flex-col gap-0.5 w-full">
            {/* Primary actions row */}
            <div className="flex gap-0.5 w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-6 min-h-6 px-2"
                onClick={handleCardClick}
              >
                View
              </Button>
              {userRole === 'ADMIN' && onEdit && (
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 text-xs h-6 min-h-6 px-2"
                  onClick={handleEditClick}
                >
                  Edit
                </Button>
              )}
            </div>

            {/* Contribution actions row - only for authenticated users */}
            {isAuthenticated && (
              <div className="flex gap-0.5 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 btn-success text-xs h-6 min-h-6 px-2"
                  onClick={handleProposeUpdateClick}
                  title="Propose an update to this vehicle"
                >
                  Update
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 btn-info text-xs h-6 min-h-6 px-2"
                  onClick={handleProposeVariantClick}
                  title="Propose a variant of this vehicle"
                >
                  Variant
                </Button>
              </div>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
});

VehicleCard.displayName = 'VehicleCard';

export default VehicleCard;
