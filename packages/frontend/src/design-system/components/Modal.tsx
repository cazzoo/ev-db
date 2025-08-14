import React, { useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';
import { Button } from './Button';

/**
 * Modal Components
 *
 * Standardized modal components using DaisyUI classes with consistent
 * styling, sizes, and accessibility features.
 */

// Modal variants
const modalVariants = cva(
  'modal',
  {
    variants: {
      open: {
        true: 'modal-open',
        false: '',
      },
    },
    defaultVariants: {
      open: false,
    },
  }
);

// Modal box variants
const modalBoxVariants = cva(
  'modal-box relative max-h-[90vh] overflow-y-auto',
  {
    variants: {
      size: {
        sm: 'w-11/12 max-w-md',
        md: 'w-11/12 max-w-2xl',
        lg: 'w-11/12 max-w-4xl',
        xl: 'w-11/12 max-w-6xl',
        full: 'w-11/12 max-w-7xl',
      },
      centered: {
        true: 'modal-middle',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      centered: true,
    },
  }
);

// Modal component
export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalVariants>,
    VariantProps<typeof modalBoxVariants> {
  onClose?: () => void;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  preventClose?: boolean;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      className,
      open,
      size,
      centered,
      onClose,
      closeOnBackdropClick = true,
      closeOnEscape = true,
      preventClose = false,
      title,
      description,
      footer,
      actions,
      children,
      ...props
    },
    ref
  ) => {
    // Handle escape key
    useEffect(() => {
      if (!open || !closeOnEscape || preventClose) return;

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose?.();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, closeOnEscape, preventClose, onClose]);

    // Handle backdrop click
    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (
        closeOnBackdropClick &&
        !preventClose &&
        event.target === event.currentTarget
      ) {
        onClose?.();
      }
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [open]);

    if (!open) return null;

    return (
      <div
        ref={ref}
        className={cn(modalVariants({ open }), className)}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        {...props}
      >
        <div className={cn(modalBoxVariants({ size, centered }))}>
          {/* Close button */}
          {!preventClose && onClose && (
            <button
              className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 z-10"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          )}

          {/* Header */}
          {(title || description) && (
            <div className="mb-6">
              {title && (
                <h3 id="modal-title" className="font-bold text-lg mb-2">
                  {title}
                </h3>
              )}
              {description && (
                <p id="modal-description" className="text-base-content/70">
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Content */}
          <div className="modal-content">
            {children}
          </div>

          {/* Footer */}
          {(footer || actions) && (
            <div className="modal-action mt-6">
              {footer || actions}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

// Confirmation Modal component
export interface ConfirmationModalProps extends Omit<ModalProps, 'actions' | 'footer'> {
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'warning' | 'error';
  loading?: boolean;
}

export const ConfirmationModal = React.forwardRef<HTMLDivElement, ConfirmationModalProps>(
  (
    {
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      onConfirm,
      onCancel,
      variant = 'default',
      loading = false,
      ...props
    },
    ref
  ) => {
    const handleCancel = () => {
      onCancel?.();
      props.onClose?.();
    };

    const handleConfirm = () => {
      onConfirm?.();
    };

    const confirmButtonVariant = {
      default: 'primary' as const,
      warning: 'warning' as const,
      error: 'error' as const,
    };

    const actions = (
      <div className="flex gap-3 justify-end">
        <Button
          variant="tertiary"
          onClick={handleCancel}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmButtonVariant[variant]}
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        >
          {confirmText}
        </Button>
      </div>
    );

    return (
      <Modal
        ref={ref}
        {...props}
        actions={actions}
        preventClose={loading}
      />
    );
  }
);

ConfirmationModal.displayName = 'ConfirmationModal';

// Form Modal component
export interface FormModalProps extends Omit<ModalProps, 'actions' | 'footer'> {
  submitText?: string;
  cancelText?: string;
  onSubmit?: (event: React.FormEvent) => void;
  onCancel?: () => void;
  loading?: boolean;
  submitDisabled?: boolean;
  form?: string;
}

export const FormModal = React.forwardRef<HTMLDivElement, FormModalProps>(
  (
    {
      submitText = 'Submit',
      cancelText = 'Cancel',
      onSubmit,
      onCancel,
      loading = false,
      submitDisabled = false,
      form,
      children,
      ...props
    },
    ref
  ) => {
    const handleCancel = () => {
      onCancel?.();
      props.onClose?.();
    };

    const handleSubmit = (event: React.FormEvent) => {
      event.preventDefault();
      onSubmit?.(event);
    };

    const actions = (
      <div className="flex gap-3 justify-end">
        <Button
          variant="tertiary"
          onClick={handleCancel}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button
          type="submit"
          form={form}
          variant="primary"
          loading={loading}
          disabled={loading || submitDisabled}
        >
          {submitText}
        </Button>
      </div>
    );

    const content = form ? (
      children
    ) : (
      <form onSubmit={handleSubmit}>
        {children}
      </form>
    );

    return (
      <Modal
        ref={ref}
        {...props}
        actions={actions}
        preventClose={loading}
      >
        {content}
      </Modal>
    );
  }
);

FormModal.displayName = 'FormModal';

// Drawer component (side modal)
export interface DrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onClose?: () => void;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
  title?: string;
  actions?: React.ReactNode;
}

export const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(
  (
    {
      className,
      open = false,
      onClose,
      side = 'right',
      size = 'md',
      overlay = true,
      title,
      actions,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'w-80',
      md: 'w-96',
      lg: 'w-[32rem]',
    };

    // Handle escape key
    useEffect(() => {
      if (!open) return;

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose?.();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    if (!open) return null;

    return (
      <div className="drawer drawer-end drawer-open fixed inset-0 z-50">
        {/* Overlay */}
        {overlay && (
          <div
            className="drawer-overlay fixed inset-0 bg-black/50"
            onClick={onClose}
          />
        )}

        {/* Drawer content */}
        <div
          ref={ref}
          className={cn(
            'drawer-side fixed top-0 h-full bg-base-100 shadow-xl z-10',
            sizeClasses[size],
            side === 'left' ? 'left-0' : 'right-0',
            className
          )}
          {...props}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            {(title || onClose) && (
              <div className="flex items-center justify-between p-6 border-b border-base-300">
                {title && (
                  <h3 className="font-bold text-lg">{title}</h3>
                )}
                {onClose && (
                  <button
                    className="btn btn-sm btn-circle btn-ghost"
                    onClick={onClose}
                    aria-label="Close drawer"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>

            {/* Actions */}
            {actions && (
              <div className="border-t border-base-300 p-6">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

Drawer.displayName = 'Drawer';
