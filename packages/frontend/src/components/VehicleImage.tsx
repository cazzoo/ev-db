import React, { useState } from 'react';

interface VehicleImageProps {
  make: string;
  model: string;
  year: number;
  className?: string;
}

const VehicleImage: React.FC<VehicleImageProps> = ({ make, model, year, className = '' }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Generate a consistent color based on vehicle info
  const generateColor = (make: string, model: string) => {
    const colors = [
      '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', 
      '#ef4444', '#ec4899', '#84cc16', '#f97316', '#3b82f6',
      '#14b8a6', '#f472b6', '#a855f7', '#22c55e', '#eab308'
    ];
    
    const hash = (make + model).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Create SVG placeholder
  const createSVGPlaceholder = (bgColor: string, text: string, subtitle: string = 'Electric Vehicle') => {
    const svg = `
      <svg width="400" height="240" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${bgColor}dd;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="400" height="240" fill="url(#grad)"/>
        
        <!-- Car icon -->
        <g transform="translate(200, 80)">
          <rect x="-40" y="-15" width="80" height="30" rx="15" fill="white" opacity="0.2"/>
          <rect x="-35" y="-10" width="70" height="20" rx="10" fill="white" opacity="0.3"/>
          <circle cx="-25" cy="10" r="8" fill="white" opacity="0.4"/>
          <circle cx="25" cy="10" r="8" fill="white" opacity="0.4"/>
          <rect x="-30" y="-5" width="15" height="8" fill="white" opacity="0.5"/>
          <rect x="15" y="-5" width="15" height="8" fill="white" opacity="0.5"/>
        </g>
        
        <text x="200" y="140" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="white" text-anchor="middle" opacity="0.95">
          ${text}
        </text>
        <text x="200" y="160" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.8">
          ${subtitle}
        </text>
        
        <!-- Decorative elements -->
        <circle cx="50" cy="50" r="2" fill="white" opacity="0.3"/>
        <circle cx="350" cy="190" r="2" fill="white" opacity="0.3"/>
        <circle cx="80" cy="200" r="1.5" fill="white" opacity="0.4"/>
        <circle cx="320" cy="60" r="1.5" fill="white" opacity="0.4"/>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  };

  const bgColor = generateColor(make, model);
  const vehicleText = `${make} ${model}`;
  const placeholderSrc = createSVGPlaceholder(bgColor, vehicleText, `${year} Electric Vehicle`);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-base-300 animate-pulse flex items-center justify-center">
          <div className="text-base-content/50 text-sm">Loading...</div>
        </div>
      )}
      
      <img
        src={placeholderSrc}
        alt={`${make} ${model} ${year}`}
        className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
        onLoad={handleImageLoad}
        onError={handleImageError}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
      
      {imageError && !isLoading && (
        <div 
          className="w-full h-full flex items-center justify-center text-white"
          style={{ backgroundColor: bgColor }}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">🚗</div>
            <div className="font-semibold">{vehicleText}</div>
            <div className="text-sm opacity-80">{year} Electric Vehicle</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleImage;
