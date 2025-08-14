import React from 'react';
import { cn } from '../utils';

/**
 * Layout Components
 *
 * Standardized layout components for consistent spacing, alignment,
 * and responsive behavior across the application.
 */

// Container component for consistent max-width and padding
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  center?: boolean;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = 'xl', padding = 'md', center = true, children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'max-w-2xl',
      md: 'max-w-4xl',
      lg: 'max-w-6xl',
      xl: 'max-w-7xl',
      full: 'max-w-full',
    };

    const paddingClasses = {
      none: '',
      sm: 'px-4 py-2',
      md: 'px-4 py-8',
      lg: 'px-6 py-12',
    };

    return (
      <div
        ref={ref}
        className={cn(
          sizeClasses[size],
          paddingClasses[padding],
          center && 'mx-auto',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';

// Grid component for responsive layouts
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: number | Partial<Record<'sm' | 'md' | 'lg' | 'xl' | '2xl', number>>;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rows?: number | 'auto';
  autoFit?: boolean;
  minItemWidth?: string;
}

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  (
    {
      className,
      cols = 1,
      gap = 'md',
      rows,
      autoFit = false,
      minItemWidth = '250px',
      children,
      ...props
    },
    ref
  ) => {
    const gapClasses = {
      none: 'gap-0',
      sm: 'gap-3',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    // Generate responsive column classes
    const getColumnClasses = () => {
      if (autoFit) {
        return `grid-cols-[repeat(auto-fit,minmax(${minItemWidth},1fr))]`;
      }

      if (typeof cols === 'number') {
        return `grid-cols-${cols}`;
      }

      const responsiveClasses = Object.entries(cols)
        .map(([breakpoint, colCount]) => {
          if (breakpoint === 'sm') {
            return `grid-cols-${colCount}`;
          }
          return `${breakpoint}:grid-cols-${colCount}`;
        })
        .join(' ');

      return responsiveClasses || 'grid-cols-1';
    };

    const rowClasses = rows
      ? typeof rows === 'number'
        ? `grid-rows-${rows}`
        : 'grid-rows-auto'
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          'grid',
          getColumnClasses(),
          rowClasses,
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Grid.displayName = 'Grid';

// Flex component for flexible layouts
export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: Partial<Record<'sm' | 'md' | 'lg' | 'xl', Partial<FlexProps>>>;
}

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      className,
      direction = 'row',
      align = 'start',
      justify = 'start',
      wrap = 'nowrap',
      gap = 'md',
      responsive,
      children,
      ...props
    },
    ref
  ) => {
    const gapClasses = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-3',
      lg: 'gap-4',
      xl: 'gap-6',
    };

    // Generate responsive classes
    const getResponsiveClasses = () => {
      if (!responsive) return '';

      return Object.entries(responsive)
        .map(([breakpoint, config]) => {
          const classes = [];
          if (config.direction) classes.push(`${breakpoint}:flex-${config.direction}`);
          if (config.align) classes.push(`${breakpoint}:items-${config.align}`);
          if (config.justify) classes.push(`${breakpoint}:justify-${config.justify}`);
          if (config.wrap) classes.push(`${breakpoint}:flex-${config.wrap}`);
          if (config.gap) {
            const responsiveGap = {
              none: 'gap-0',
              sm: 'gap-2',
              md: 'gap-3',
              lg: 'gap-4',
              xl: 'gap-6',
            };
            classes.push(`${breakpoint}:${responsiveGap[config.gap]}`);
          }
          return classes.join(' ');
        })
        .join(' ');
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          `flex-${direction}`,
          `items-${align}`,
          `justify-${justify}`,
          `flex-${wrap}`,
          gapClasses[gap],
          getResponsiveClasses(),
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Flex.displayName = 'Flex';

// Stack component for vertical layouts with consistent spacing
export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  divider?: React.ReactNode;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, spacing = 'md', align = 'stretch', divider, children, ...props }, ref) => {
    const spacingClasses = {
      none: 'space-y-0',
      sm: 'space-y-2',
      md: 'space-y-4',
      lg: 'space-y-6',
      xl: 'space-y-8',
    };

    const alignClasses = {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    };

    const childrenArray = React.Children.toArray(children);

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col',
          alignClasses[align],
          !divider && spacingClasses[spacing],
          className
        )}
        {...props}
      >
        {divider
          ? childrenArray.map((child, index) => (
              <React.Fragment key={index}>
                {child}
                {index < childrenArray.length - 1 && (
                  <div className="flex-shrink-0">{divider}</div>
                )}
              </React.Fragment>
            ))
          : children}
      </div>
    );
  }
);

Stack.displayName = 'Stack';

// Section component for page sections with consistent spacing
export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  background?: 'none' | 'base' | 'neutral' | 'primary' | 'secondary';
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, spacing = 'lg', background = 'none', children, ...props }, ref) => {
    const spacingClasses = {
      none: 'py-0',
      sm: 'py-8',
      md: 'py-12',
      lg: 'py-16',
      xl: 'py-24',
    };

    const backgroundClasses = {
      none: '',
      base: 'bg-base-100',
      neutral: 'bg-neutral',
      primary: 'bg-primary text-primary-content',
      secondary: 'bg-secondary text-secondary-content',
    };

    return (
      <section
        ref={ref}
        className={cn(
          spacingClasses[spacing],
          backgroundClasses[background],
          className
        )}
        {...props}
      >
        {children}
      </section>
    );
  }
);

Section.displayName = 'Section';

// Spacer component for adding space between elements
export interface SpacerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  axis?: 'x' | 'y' | 'both';
}

export const Spacer: React.FC<SpacerProps> = ({ size = 'md', axis = 'y' }) => {
  const sizeClasses = {
    sm: '2',
    md: '4',
    lg: '6',
    xl: '8',
    '2xl': '12',
  };

  const axisClasses = {
    x: `w-${sizeClasses[size]}`,
    y: `h-${sizeClasses[size]}`,
    both: `w-${sizeClasses[size]} h-${sizeClasses[size]}`,
  };

  return <div className={axisClasses[axis]} aria-hidden="true" />;
};

Spacer.displayName = 'Spacer';
