import { useEffect, useState } from 'react';

interface Stat {
  id: string;
  title: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
  description?: string;
}

interface EnhancedStatsProps {
  stats: Stat[];
  title?: string;
  className?: string;
}

const EnhancedStats = ({ stats, title, className = '' }: EnhancedStatsProps) => {
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  // Animate numbers on mount
  useEffect(() => {
    const initialValues: Record<string, number> = {};
    stats.forEach(stat => {
      initialValues[stat.id] = 0;
    });
    setAnimatedValues(initialValues);

    // Animate to final values
    const timer = setTimeout(() => {
      const finalValues: Record<string, number> = {};
      stats.forEach(stat => {
        finalValues[stat.id] = stat.value;
      });
      setAnimatedValues(finalValues);
    }, 100);

    return () => clearTimeout(timer);
  }, [stats]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getColorClasses = (color: Stat['color']) => {
    const colorMap = {
      primary: 'text-primary bg-primary/10 border-primary/20',
      secondary: 'text-secondary bg-secondary/10 border-secondary/20',
      accent: 'text-accent bg-accent/10 border-accent/20',
      info: 'text-info bg-info/10 border-info/20',
      success: 'text-success bg-success/10 border-success/20',
      warning: 'text-warning bg-warning/10 border-warning/20',
      error: 'text-error bg-error/10 border-error/20',
    };
    return colorMap[color];
  };

  const getChangeIcon = (changeType?: 'increase' | 'decrease' | 'neutral') => {
    switch (changeType) {
      case 'increase':
        return (
          <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'decrease':
        return (
          <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      case 'neutral':
        return (
          <svg className="w-4 h-4 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${className}`}>
      {title && (
        <h2 className="text-2xl font-bold mb-6 text-base-content">{title}</h2>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="relative overflow-hidden rounded-xl bg-base-100 shadow-lg border border-base-300 hover:shadow-xl transition-all duration-300 group"
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-current"></div>
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-current"></div>
            </div>

            <div className="relative p-6">
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg border-2 mb-4 ${getColorClasses(stat.color)}`}>
                {stat.icon}
              </div>

              {/* Value */}
              <div className="mb-2">
                <div className="text-3xl font-bold text-base-content transition-all duration-1000 ease-out">
                  {formatNumber(animatedValues[stat.id] || 0)}
                </div>
                <div className="text-sm font-medium text-base-content/70">
                  {stat.title}
                </div>
              </div>

              {/* Change Indicator */}
              {stat.change !== undefined && (
                <div className="flex items-center gap-1 mb-2">
                  {getChangeIcon(stat.changeType)}
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-success' :
                    stat.changeType === 'decrease' ? 'text-error' :
                    'text-base-content/50'
                  }`}>
                    {stat.changeType === 'neutral' ? '0%' : `${Math.abs(stat.change)}%`}
                  </span>
                  <span className="text-xs text-base-content/50">vs last period</span>
                </div>
              )}

              {/* Description */}
              {stat.description && (
                <div className="text-xs text-base-content/60 leading-relaxed">
                  {stat.description}
                </div>
              )}

              {/* Hover Effect */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.color === 'primary' ? 'bg-primary' : 
                stat.color === 'secondary' ? 'bg-secondary' :
                stat.color === 'accent' ? 'bg-accent' :
                stat.color === 'info' ? 'bg-info' :
                stat.color === 'success' ? 'bg-success' :
                stat.color === 'warning' ? 'bg-warning' :
                'bg-error'
              } transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Predefined icon components for common stats
export const StatIcons = {
  users: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  vehicles: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9m-4-13a4 4 0 118 0 4 4 0 01-8 0z" />
    </svg>
  ),
  contributions: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  currency: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  api: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  pending: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  approved: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  rejected: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default EnhancedStats;
