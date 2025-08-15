import React, { useState, useRef, useEffect } from 'react';
import VehicleImage from './VehicleImage';

interface VehicleImageData {
  id: number;
  url: string;
  altText?: string;
  caption?: string;
}

interface VehicleImageCarouselProps {
  images: VehicleImageData[];
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  className?: string;
  showIndicators?: boolean;
  showNavigation?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

const VehicleImageCarousel: React.FC<VehicleImageCarouselProps> = ({
  images,
  vehicleMake,
  vehicleModel,
  vehicleYear,
  className = '',
  showIndicators = true,
  showNavigation = true,
  autoPlay = false,
  autoPlayInterval = 5000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<number | null>(null);

  // If no images provided, show placeholder
  const hasImages = images && images.length > 0;
  const displayImages = hasImages ? images : [];

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && hasImages && images.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, autoPlayInterval);

      return () => {
        if (autoPlayRef.current) {
          clearInterval(autoPlayRef.current);
        }
      };
    }
  }, [autoPlay, autoPlayInterval, hasImages, images.length]);

  // Stop auto-play on user interaction
  const handleUserInteraction = () => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
      autoPlayRef.current = null;
    }
  };

  const goToSlide = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent event bubbling to parent components
    }
    handleUserInteraction();
    setCurrentIndex(index);

    // Scroll to the specific slide
    const carousel = carouselRef.current;
    if (carousel) {
      const slideElement = carousel.querySelector(`#slide-${index}`) as HTMLElement;
      if (slideElement) {
        slideElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      }
    }
  };

  const goToPrevious = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent event bubbling to parent components
    }
    const newIndex = currentIndex === 0 ? displayImages.length - 1 : currentIndex - 1;
    goToSlide(newIndex);
  };

  const goToNext = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent event bubbling to parent components
    }
    const newIndex = (currentIndex + 1) % displayImages.length;
    goToSlide(newIndex);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      goToNext();
    }
  };

  // Handle touch/swipe events
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent event bubbling during touch interactions
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent event bubbling during touch interactions
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent event bubbling during touch interactions
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && displayImages.length > 1) {
      goToNext();
    }
    if (isRightSwipe && displayImages.length > 1) {
      goToPrevious();
    }
  };

  // If no images, show placeholder
  if (!hasImages) {
    return (
      <div className={`relative ${className}`}>
        <VehicleImage
          make={vehicleMake}
          model={vehicleModel}
          year={vehicleYear}
          className="w-full h-full"
        />
      </div>
    );
  }

  // Single image - no carousel needed
  if (displayImages.length === 1) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={displayImages[0].url}
          alt={displayImages[0].altText || `${vehicleMake} ${vehicleModel}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            const target = e.target as HTMLImageElement;
            const placeholder = document.createElement('div');
            placeholder.className = 'w-full h-full';
            target.parentNode?.replaceChild(placeholder, target);

            // Render VehicleImage component as fallback
            import('react-dom').then(({ render }) => {
              render(
                React.createElement(VehicleImage, {
                  make: vehicleMake,
                  model: vehicleModel,
                  year: vehicleYear,
                  className: 'w-full h-full'
                }),
                placeholder
              );
            });
          }}
        />
        {displayImages[0].caption && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
            {displayImages[0].caption}
          </div>
        )}
      </div>
    );
  }

  // Multiple images - full carousel
  return (
    <div
      className={`relative ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label={`Image carousel for ${vehicleMake} ${vehicleModel}`}
    >
      {/* Main carousel */}
      <div
        ref={carouselRef}
        className="carousel w-full h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {displayImages.map((image, index) => (
          <div
            key={image.id}
            id={`slide-${index}`}
            className="carousel-item relative w-full h-full"
          >
            <img
              src={image.url}
              alt={image.altText || `${vehicleMake} ${vehicleModel} - Image ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                const placeholder = document.createElement('div');
                placeholder.className = 'w-full h-full';
                target.parentNode?.replaceChild(placeholder, target);

                // Render VehicleImage component as fallback
                import('react-dom').then(({ render }) => {
                  render(
                    React.createElement(VehicleImage, {
                      make: vehicleMake,
                      model: vehicleModel,
                      year: vehicleYear,
                      className: 'w-full h-full'
                    }),
                    placeholder
                  );
                });
              }}
            />

            {/* Caption overlay */}
            {image.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-sm">
                {image.caption}
              </div>
            )}

            {/* Navigation arrows */}
            {showNavigation && displayImages.length > 1 && (
              <div className="absolute left-2 right-2 top-1/2 flex -translate-y-1/2 transform justify-between">
                <button
                  className="btn btn-circle btn-sm bg-black bg-opacity-50 border-none text-white hover:bg-opacity-75"
                  onClick={goToPrevious}
                  aria-label="Previous image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="btn btn-circle btn-sm bg-black bg-opacity-50 border-none text-white hover:bg-opacity-75"
                  onClick={goToNext}
                  aria-label="Next image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Indicators */}
      {showIndicators && displayImages.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
          {displayImages.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-white'
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
              onClick={(e) => goToSlide(index, e)}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image counter */}
      {displayImages.length > 1 && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          {currentIndex + 1} / {displayImages.length}
        </div>
      )}
    </div>
  );
};

export default VehicleImageCarousel;
