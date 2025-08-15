import React from 'react';
import { Vehicle } from '../services/api';
import VehicleImageCarousel from './VehicleImageCarousel';

interface VehicleDetailsViewProps {
  vehicle: Vehicle;
  onClose: () => void;
}

const VehicleDetailsView: React.FC<VehicleDetailsViewProps> = ({ vehicle, onClose }) => {
  const formatValue = (value: number | undefined, unit: string): string => {
    return value ? `${value} ${unit}` : 'Not specified';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-base-content">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-base-content/60 mt-1">Electric Vehicle</p>
        </div>
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle btn-ghost"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Vehicle Images */}
      <div className="w-full">
        <h3 className="text-lg font-semibold mb-3">Images</h3>
        <div className="h-64 bg-base-200 rounded-lg overflow-hidden">
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
        </div>
        {vehicle.images && vehicle.images.length > 0 && (
          <p className="text-sm text-base-content/60 mt-2">
            {vehicle.images.length} image{vehicle.images.length !== 1 ? 's' : ''} available
          </p>
        )}
      </div>

      {/* Vehicle Specifications */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Specifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Performance Specs */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <h4 className="font-semibold text-base mb-3">Performance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-base-content/70">Battery Capacity:</span>
                  <span className="font-medium">{formatValue(vehicle.batteryCapacity, 'kWh')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Range:</span>
                  <span className="font-medium">{formatValue(vehicle.range, 'km')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Charging Speed:</span>
                  <span className="font-medium">{formatValue(vehicle.chargingSpeed, 'kW')}</span>
                </div>
                {vehicle.acceleration && (
                  <div className="flex justify-between">
                    <span className="text-base-content/70">0-100 km/h:</span>
                    <span className="font-medium">{vehicle.acceleration}s</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <h4 className="font-semibold text-base mb-3">Additional Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-base-content/70">Top Speed:</span>
                  <span className="font-medium">{formatValue(vehicle.topSpeed, 'km/h')}</span>
                </div>
                {vehicle.price && (
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Price:</span>
                    <span className="font-medium">${vehicle.price.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-base-content/70">Year:</span>
                  <span className="font-medium">{vehicle.year}</span>
                </div>
                {vehicle.id && (
                  <div className="flex justify-between">
                    <span className="text-base-content/70">Vehicle ID:</span>
                    <span className="font-medium">#{vehicle.id}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {vehicle.description && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Description</h3>
          <div className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <p className="text-base-content leading-relaxed">{vehicle.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t border-base-300">
        <button
          onClick={onClose}
          className="btn btn-outline"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default VehicleDetailsView;
