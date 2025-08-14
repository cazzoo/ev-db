import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * Card Components
 *
 * Standardized card components using DaisyUI classes with consistent
 * styling, spacing, and variants for different use cases.
 */

// Card variants
const cardVariants = cva(
  'card bg-base-100 shadow-md transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'border border-base-300',
        elevated: 'shadow-lg',
        outlined: 'border-2 border-base-300 shadow-none',
        filled: 'bg-base-200 border-none',
        ghost: 'bg-transparent shadow-none border-none',
      },
      size: {
        sm: 'card-compact',
        md: '',
        lg: 'p-6',
      },
      hover: {
        true: 'hover:shadow-lg hover:-translate-y-1 cursor-pointer',
        false: '',
      },
      interactive: {
        true: 'hover:bg-base-200/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hover: false,
      interactive: false,
    },
  }
);

// Card component
export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, hover, interactive, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, size, hover, interactive }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header component
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  avatar?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, actions, avatar, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('card-header flex items-start justify-between p-6 pb-4', className)}
        {...props}
      >
        <div className="flex items-start gap-4 flex-1">
          {avatar && <div className="flex-shrink-0">{avatar}</div>}
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="card-title text-lg font-semibold text-base-content mb-1">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-base-content/60 mb-2">{subtitle}</p>
            )}
            {children}
          </div>
        </div>
        {actions && <div className="flex-shrink-0 ml-4">{actions}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

// Card Body component
export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    const paddingClasses = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn('card-body', paddingClasses[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

// Card Footer component
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  justify?: 'start' | 'center' | 'end' | 'between';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, justify = 'end', padding = 'md', children, ...props }, ref) => {
    const justifyClasses = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    };

    const paddingClasses = {
      none: 'p-0',
      sm: 'p-4 pt-2',
      md: 'p-6 pt-4',
      lg: 'p-8 pt-6',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'card-actions flex items-center gap-3',
          justifyClasses[justify],
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Stats Card component for displaying metrics
export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  (
    {
      className,
      title,
      value,
      description,
      trend,
      icon,
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      default: 'bg-base-100 text-base-content',
      primary: 'bg-primary text-primary-content',
      secondary: 'bg-secondary text-secondary-content',
      success: 'bg-success text-success-content',
      warning: 'bg-warning text-warning-content',
      error: 'bg-error text-error-content',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'stat bg-base-100 rounded-lg border border-base-300 p-6',
          variantClasses[variant],
          className
        )}
        {...props}
      >
        <div className="stat-figure text-2xl opacity-80">
          {icon}
        </div>

        <div className="stat-title text-sm font-medium opacity-70 mb-1">
          {title}
        </div>

        <div className="stat-value text-2xl font-bold mb-2">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>

        {(description || trend) && (
          <div className="stat-desc text-sm opacity-70">
            {trend && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 font-medium',
                  trend.isPositive ? 'text-success' : 'text-error'
                )}
              >
                <span>{trend.isPositive ? '↗' : '↘'}</span>
                {Math.abs(trend.value)}%
                {trend.label && <span className="ml-1">{trend.label}</span>}
              </span>
            )}
            {description && (
              <span className={trend ? 'ml-2' : ''}>{description}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

StatsCard.displayName = 'StatsCard';

// Feature Card component for showcasing features
export interface FeatureCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  title: string;
  description: string;
  icon?: React.ReactNode;
  image?: string;
  href?: string;
  badge?: string;
  actions?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement | HTMLAnchorElement>;
}

export const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  (
    {
      className,
      title,
      description,
      icon,
      image,
      href,
      badge,
      actions,
      onClick,
      ...props
    },
    ref
  ) => {
    if (href) {
      return (
        <a
          href={href}
          className={cn(
            'card bg-base-100 shadow-md border border-base-300 transition-all duration-200',
            'hover:shadow-lg hover:-translate-y-1 cursor-pointer',
            className
          )}
          onClick={onClick}
        >
          {image && (
            <figure className="relative">
              <img
                src={image}
                alt={title}
                className="w-full h-48 object-cover"
              />
              {badge && (
                <div className="absolute top-4 right-4">
                  <span className="badge badge-primary">{badge}</span>
                </div>
              )}
            </figure>
          )}

          <div className="card-body p-6">
            {icon && !image && (
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                <div className="text-primary text-xl">{icon}</div>
              </div>
            )}

            <h3 className="card-title text-lg font-semibold mb-2">{title}</h3>
            <p className="text-base-content/70 mb-4">{description}</p>

            {actions && (
              <div className="card-actions justify-end">
                {actions}
              </div>
            )}
          </div>
        </a>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'card bg-base-100 shadow-md border border-base-300 transition-all duration-200',
          className
        )}
        {...props}
      >
        {image && (
          <figure className="relative">
            <img
              src={image}
              alt={title}
              className="w-full h-48 object-cover"
            />
            {badge && (
              <div className="absolute top-4 right-4">
                <span className="badge badge-primary">{badge}</span>
              </div>
            )}
          </figure>
        )}

        <div className="card-body p-6">
          {icon && !image && (
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
              <div className="text-primary text-xl">{icon}</div>
            </div>
          )}

          <h3 className="card-title text-lg font-semibold mb-2">{title}</h3>
          <p className="text-base-content/70 mb-4">{description}</p>

          {actions && (
            <div className="card-actions justify-end">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }
);

FeatureCard.displayName = 'FeatureCard';
