import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * Button Component
 *
 * A standardized button component using DaisyUI classes with consistent
 * variants, sizes, and states. This component ensures visual consistency
 * across the entire application.
 */

// Button variants using class-variance-authority for type-safe styling
const buttonVariants = cva(
  // Base classes - common to all buttons
  'btn font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Primary button - main actions
        primary: 'btn-primary hover:btn-primary focus:ring-primary/50',

        // Secondary button - secondary actions
        secondary: 'btn-secondary hover:btn-secondary focus:ring-secondary/50',

        // Tertiary/Ghost button - subtle actions
        tertiary: 'btn-ghost hover:btn-ghost focus:ring-base-content/20',

        // Outline button - alternative style
        outline: 'btn-outline hover:btn-outline focus:ring-primary/50',

        // Success button - positive actions
        success: 'btn-success hover:btn-success focus:ring-success/50',

        // Warning button - caution actions
        warning: 'btn-warning hover:btn-warning focus:ring-warning/50',

        // Error/Danger button - destructive actions
        error: 'btn-error hover:btn-error focus:ring-error/50',

        // Info button - informational actions
        info: 'btn-info hover:btn-info focus:ring-info/50',

        // Link button - text-like appearance
        link: 'btn-link hover:btn-link focus:ring-primary/50',
      },
      size: {
        // Small button
        sm: 'btn-sm h-8 px-3 text-sm',

        // Medium button (default)
        md: 'btn-md h-10 px-4 text-base',

        // Large button
        lg: 'btn-lg h-12 px-6 text-lg',

        // Extra large button
        xl: 'h-14 px-8 text-xl',
      },
      width: {
        // Auto width (default)
        auto: 'w-auto',

        // Full width
        full: 'w-full',

        // Fit content
        fit: 'w-fit',
      },
      loading: {
        true: 'loading',
        false: '',
      },
      disabled: {
        true: 'btn-disabled cursor-not-allowed opacity-50',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      width: 'auto',
      loading: false,
      disabled: false,
    },
  }
);

// Button component props interface
export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    VariantProps<typeof buttonVariants> {
  // Additional props
  asChild?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
}

// Button component implementation
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      width,
      loading,
      disabled,
      asChild = false,
      leftIcon,
      rightIcon,
      loadingText,
      children,
      ...props
    },
    ref
  ) => {
    // Determine if button should be disabled
    const isDisabled = Boolean(disabled || loading);

    // Button content with icons and loading state
    const buttonContent = (
      <>
        {loading && !leftIcon && (
          <span className="loading loading-spinner loading-sm mr-2" />
        )}
        {leftIcon && !loading && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        <span className={loading ? 'opacity-0' : ''}>
          {loading && loadingText ? loadingText : children}
        </span>
        {rightIcon && !loading && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </>
    );

    return (
      <button
        className={cn(
          buttonVariants({
            variant,
            size,
            width,
            loading,
            disabled: isDisabled,
          }),
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };

// Button group component for related actions
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = 'horizontal', size = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'btn-group',
          orientation === 'vertical' && 'btn-group-vertical',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === Button) {
            return React.cloneElement(child, { size } as any);
          }
          return child;
        })}
      </div>
    );
  }
);

ButtonGroup.displayName = 'ButtonGroup';

// Icon button component for icon-only buttons
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = 'md', ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn('btn-square', className)}
        size={size}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';
