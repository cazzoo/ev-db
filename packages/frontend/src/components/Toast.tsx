import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/solid';
import { useToast, Toast as ToastType } from '../context/ToastContext';

const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast toast-top toast-end z-50">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const getAlertClass = (type: ToastType['type']) => {
    switch (type) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'warning':
        return 'alert-warning';
      case 'info':
      default:
        return 'alert-info';
    }
  };

  const getIcon = (type: ToastType['type']) => {
    const iconClass = "h-6 w-6 shrink-0";
    
    switch (type) {
      case 'success':
        return <CheckCircleIcon className={iconClass} />;
      case 'error':
        return <ExclamationCircleIcon className={iconClass} />;
      case 'warning':
        return <ExclamationTriangleIcon className={iconClass} />;
      case 'info':
      default:
        return <InformationCircleIcon className={iconClass} />;
    }
  };

  const handleDismiss = () => {
    onDismiss(toast.id);
  };

  return (
    <div 
      className={`alert ${getAlertClass(toast.type)} shadow-lg animate-slide-in-right`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {getIcon(toast.type)}
      <span className="flex-1">{toast.message}</span>
      {toast.dismissible && (
        <button
          onClick={handleDismiss}
          className="btn btn-sm btn-ghost btn-square"
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default ToastContainer;
