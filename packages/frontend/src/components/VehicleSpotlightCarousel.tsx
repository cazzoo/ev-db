import React, { useState, useRef, useEffect } from 'react';
import { Vehicle } from '../services/api';
import VehicleImageCarousel from './VehicleImageCarousel';

interface VehicleSpotlightCarouselProps {
  vehicles: Vehicle[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  className?: string;
}

const VehicleSpotlightCarousel: React.FC<VehicleSpotlightCarouselProps> = ({
  vehicles,
  onVehicleClick,
  autoPlay = true,
  autoPlayInterval = 5000,
  className = ''
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && vehicles.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % vehicles.length);
      }, autoPlayInterval);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
  }, [autoPlay, autoPlayInterval, vehicles.length]);

  // Stop auto-play on user interaction
  const handleUserInteraction = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const goToSlide = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    handleUserInteraction();
    setCurrentIndex(index);

    // Scroll to the specific slide
    const carousel = carouselRef.current;
    if (carousel) {
      const slideElement = carousel.querySelector(`#vehicle-slide-${index}`) as HTMLElement;
      if (slideElement) {
        slideElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    }
  };

  const goToPrevious = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const newIndex = currentIndex === 0 ? vehicles.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  };

  const goToNext = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const newIndex = (currentIndex + 1) % vehicles.length;
    goToSlide(newIndex);
  };

  const handleVehicleClick = (vehicle: Vehicle) => {
    handleUserInteraction();
    if (onVehicleClick) {
      onVehicleClick(vehicle);
    }
  };

  const formatValue = (value: number | undefined, unit: string) => {
    return value ? `${value} ${unit}` : 'N/A';
  };

  if (vehicles.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <p className="text-base-content/70">No recent vehicles to display.</p>
      </div>
    );
  }

  if (vehicles.length === 1) {
    const vehicle = vehicles[0];
    return (
      <div className={`relative ${className}`}>
        <div
          className="card bg-base-100 shadow-2xl cursor-pointer hover:shadow-3xl transition-all duration-300 transform hover:scale-[1.02]"
          onClick={() => handleVehicleClick(vehicle)}
        >
          <figure className="relative h-80 overflow-hidden">
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
            {vehicle.isNew && (
              <div className="absolute top-4 right-4 z-10">
                <span className="badge badge-accent badge-lg font-bold animate-pulse">NEW</span>
              </div>
            )}
          </figure>
          <div className="card-body">
            <h3 className="card-title text-2xl">{vehicle.make} {vehicle.model}</h3>
            <p className="text-lg text-base-content/70">{vehicle.year}</p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="stat">
                <div className="stat-title text-xs">Battery</div>
                <div className="stat-value text-sm">{formatValue(vehicle.batteryCapacity, 'kWh')}</div>
              </div>
              <div className="stat">
                <div className="stat-title text-xs">Range</div>
                <div className="stat-value text-sm">{formatValue(vehicle.range, 'km')}</div>
              </div>
              <div className="stat">
                <div className="stat-title text-xs">Charging</div>
                <div className="stat-value text-sm">{formatValue(vehicle.chargingSpeed, 'kW')}</div>
              </div>
              <div className="stat">
                <div className="stat-title text-xs">Price</div>
                <div className="stat-value text-sm">{formatValue(vehicle.price, '$')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main carousel */}
      <div
        ref={carouselRef}
        className="carousel w-full h-96 rounded-2xl overflow-hidden shadow-2xl"
      >
        {vehicles.map((vehicle, index) => (
          <div
            key={vehicle.id}
            id={`vehicle-slide-${index}`}
            className="carousel-item relative w-full h-full"
          >
            <div
              className="relative w-full h-full cursor-pointer group"
              onClick={() => handleVehicleClick(vehicle)}
            >
              {/* Background Image */}
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
                showIndicators={false}
                showNavigation={false}
                autoPlay={false}
              />

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <div className="flex items-end justify-between">
                  <div className="flex-1">
                    <h3 className="text-4xl font-bold mb-2">{vehicle.make} {vehicle.model}</h3>
                    <p className="text-2xl text-white/90 mb-4">{vehicle.year}</p>

                    {/* Specs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-white/70">Battery</div>
                        <div className="text-lg font-semibold">{formatValue(vehicle.batteryCapacity, 'kWh')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-white/70">Range</div>
                        <div className="text-lg font-semibold">{formatValue(vehicle.range, 'km')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-white/70">Charging</div>
                        <div className="text-lg font-semibold">{formatValue(vehicle.chargingSpeed, 'kW')}</div>
                      </div>
                      <div>
                        <div className="text-sm text-white/70">Price</div>
                        <div className="text-lg font-semibold">{formatValue(vehicle.price, '$')}</div>
                      </div>
                    </div>
                  </div>

                  {/* NEW badge */}
                  {vehicle.isNew && (
                    <div className="ml-4">
                      <span className="badge badge-accent badge-lg font-bold animate-pulse">NEW</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows */}
      {vehicles.length > 1 && (
        <div className="absolute left-4 right-4 top-1/2 flex -translate-y-1/2 transform justify-between pointer-events-none">
          <button
            className="btn btn-circle btn-lg bg-black/50 border-none text-white hover:bg-black/75 pointer-events-auto"
            onClick={goToPrevious}
            aria-label="Previous vehicle"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="btn btn-circle btn-lg bg-black/50 border-none text-white hover:bg-black/75 pointer-events-auto"
            onClick={goToNext}
            aria-label="Next vehicle"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Indicators */}
      {vehicles.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {vehicles.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-white scale-125'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              onClick={(e) => goToSlide(index, e)}
              aria-label={`Go to vehicle ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Vehicle counter */}
      {vehicles.length > 1 && (
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium">
          {currentIndex + 1} / {vehicles.length}
        </div>
      )}
    </div>
  );
};

export default VehicleSpotlightCarousel;
