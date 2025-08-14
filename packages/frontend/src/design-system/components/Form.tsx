import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

/**
 * Form Components
 *
 * Standardized form components using DaisyUI classes with consistent
 * styling, validation states, and accessibility features.
 */

// Form field wrapper variants
const formFieldVariants = cva(
  'form-control w-full',
  {
    variants: {
      size: {
        sm: 'form-control-sm',
        md: '',
        lg: 'form-control-lg',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

// Input variants
const inputVariants = cva(
  'input input-bordered w-full transition-all duration-200 focus:outline-none',
  {
    variants: {
      size: {
        sm: 'input-sm h-8 text-sm',
        md: 'input-md h-10 text-base',
        lg: 'input-lg h-12 text-lg',
      },
      state: {
        default: 'focus:border-primary focus:ring-2 focus:ring-primary/20',
        success: 'input-success border-success focus:border-success focus:ring-success/20',
        warning: 'input-warning border-warning focus:border-warning focus:ring-warning/20',
        error: 'input-error border-error focus:border-error focus:ring-error/20',
      },
      disabled: {
        true: 'input-disabled cursor-not-allowed opacity-50',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
      disabled: false,
    },
  }
);

// Label component
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, size = 'md', children, ...props }, ref) => {
    const sizeClasses = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
    };

    return (
      <label
        ref={ref}
        className={cn(
          'label cursor-pointer',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <span className="label-text font-medium">
          {children}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      </label>
    );
  }
);

Label.displayName = 'Label';

// Input component
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'disabled' | 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size,
      state,
      disabled,
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!errorMessage;
    const finalState = hasError ? 'error' : state;

    return (
      <div className={cn(formFieldVariants({ size }))}>
        {label && (
          <Label htmlFor={inputId} required={required} size={size}>
            {label}
          </Label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/60">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ size, state: finalState, disabled }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-base-content/60">
              {rightIcon}
            </div>
          )}
        </div>

        {(helperText || errorMessage) && (
          <div className="label">
            <span
              id={hasError ? `${inputId}-error` : `${inputId}-helper`}
              className={cn(
                'label-text-alt',
                hasError ? 'text-error' : 'text-base-content/60'
              )}
            >
              {errorMessage || helperText}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea component
export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'disabled'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      size,
      state,
      disabled,
      label,
      helperText,
      errorMessage,
      required,
      resize = 'vertical',
      id,
      ...props
    },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!errorMessage;
    const finalState = hasError ? 'error' : state;

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    return (
      <div className={cn(formFieldVariants({ size }))}>
        {label && (
          <Label htmlFor={textareaId} required={required} size={size}>
            {label}
          </Label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'textarea textarea-bordered w-full transition-all duration-200 focus:outline-none',
            size === 'sm' && 'textarea-sm text-sm',
            size === 'lg' && 'textarea-lg text-lg',
            finalState === 'success' && 'textarea-success border-success focus:border-success focus:ring-success/20',
            finalState === 'warning' && 'textarea-warning border-warning focus:border-warning focus:ring-warning/20',
            finalState === 'error' && 'textarea-error border-error focus:border-error focus:ring-error/20',
            finalState === 'default' && 'focus:border-primary focus:ring-2 focus:ring-primary/20',
            disabled && 'textarea-disabled cursor-not-allowed opacity-50',
            resizeClasses[resize],
            className
          )}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined
          }
          {...props}
        />

        {(helperText || errorMessage) && (
          <div className="label">
            <span
              id={hasError ? `${textareaId}-error` : `${textareaId}-helper`}
              className={cn(
                'label-text-alt',
                hasError ? 'text-error' : 'text-base-content/60'
              )}
            >
              {errorMessage || helperText}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Select component
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'disabled' | 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      size,
      state,
      disabled,
      label,
      helperText,
      errorMessage,
      placeholder,
      required,
      options,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!errorMessage;
    const finalState = hasError ? 'error' : state;

    return (
      <div className={cn(formFieldVariants({ size }))}>
        {label && (
          <Label htmlFor={selectId} required={required} size={size}>
            {label}
          </Label>
        )}

        <select
          ref={ref}
          id={selectId}
          className={cn(
            'select select-bordered w-full transition-all duration-200 focus:outline-none',
            size === 'sm' && 'select-sm h-8 text-sm',
            size === 'lg' && 'select-lg h-12 text-lg',
            finalState === 'success' && 'select-success border-success focus:border-success focus:ring-success/20',
            finalState === 'warning' && 'select-warning border-warning focus:border-warning focus:ring-warning/20',
            finalState === 'error' && 'select-error border-error focus:border-error focus:ring-error/20',
            finalState === 'default' && 'focus:border-primary focus:ring-2 focus:ring-primary/20',
            disabled && 'select-disabled cursor-not-allowed opacity-50',
            className
          )}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined
          }
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options
            ? options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))
            : children}
        </select>

        {(helperText || errorMessage) && (
          <div className="label">
            <span
              id={hasError ? `${selectId}-error` : `${selectId}-helper`}
              className={cn(
                'label-text-alt',
                hasError ? 'text-error' : 'text-base-content/60'
              )}
            >
              {errorMessage || helperText}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Checkbox component
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      size = 'md',
      label,
      helperText,
      errorMessage,
      indeterminate,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!errorMessage;

    const sizeClasses = {
      sm: 'checkbox-sm',
      md: '',
      lg: 'checkbox-lg',
    };

    return (
      <div className="form-control">
        <label className="label cursor-pointer justify-start gap-3">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              'checkbox',
              sizeClasses[size],
              hasError && 'checkbox-error',
              disabled && 'checkbox-disabled',
              className
            )}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${checkboxId}-error` : helperText ? `${checkboxId}-helper` : undefined
            }
            {...props}
          />
          {label && (
            <span className="label-text">
              {label}
            </span>
          )}
        </label>

        {(helperText || errorMessage) && (
          <div className="label">
            <span
              id={hasError ? `${checkboxId}-error` : `${checkboxId}-helper`}
              className={cn(
                'label-text-alt',
                hasError ? 'text-error' : 'text-base-content/60'
              )}
            >
              {errorMessage || helperText}
            </span>
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// Radio component
export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, size = 'md', label, disabled, id, ...props }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    const sizeClasses = {
      sm: 'radio-sm',
      md: '',
      lg: 'radio-lg',
    };

    return (
      <label className="label cursor-pointer justify-start gap-3">
        <input
          ref={ref}
          type="radio"
          id={radioId}
          className={cn(
            'radio',
            sizeClasses[size],
            disabled && 'radio-disabled',
            className
          )}
          disabled={disabled}
          {...props}
        />
        {label && (
          <span className="label-text">
            {label}
          </span>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';

// Radio Group component
export interface RadioGroupProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  label?: string;
  helperText?: string;
  errorMessage?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      name,
      value,
      onChange,
      options,
      label,
      helperText,
      errorMessage,
      size = 'md',
      orientation = 'vertical',
      className,
    },
    ref
  ) => {
    const groupId = `radio-group-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!errorMessage;

    return (
      <div ref={ref} className={cn('form-control', className)}>
        {label && (
          <Label size={size}>
            {label}
          </Label>
        )}

        <div
          className={cn(
            'flex gap-4',
            orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
          )}
          role="radiogroup"
          aria-labelledby={label ? `${groupId}-label` : undefined}
          aria-invalid={hasError}
          aria-describedby={
            hasError ? `${groupId}-error` : helperText ? `${groupId}-helper` : undefined
          }
        >
          {options.map((option) => (
            <Radio
              key={option.value}
              name={name}
              value={option.value}
              label={option.label}
              size={size}
              disabled={option.disabled}
              checked={value === option.value}
              onChange={(e) => onChange?.(e.target.value)}
            />
          ))}
        </div>

        {(helperText || errorMessage) && (
          <div className="label">
            <span
              id={hasError ? `${groupId}-error` : `${groupId}-helper`}
              className={cn(
                'label-text-alt',
                hasError ? 'text-error' : 'text-base-content/60'
              )}
            >
              {errorMessage || helperText}
            </span>
          </div>
        )}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

// Form component for wrapping forms
export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  spacing?: 'sm' | 'md' | 'lg';
}

export const Form = React.forwardRef<HTMLFormElement, FormProps>(
  ({ className, spacing = 'md', children, ...props }, ref) => {
    const spacingClasses = {
      sm: 'space-y-3',
      md: 'space-y-4',
      lg: 'space-y-6',
    };

    return (
      <form
        ref={ref}
        className={cn(spacingClasses[spacing], className)}
        {...props}
      >
        {children}
      </form>
    );
  }
);

Form.displayName = 'Form';
