import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number; // auto-dismiss time in ms, 0 = no auto-dismiss
  dismissible?: boolean; // show close button
}

export interface ToastOptions {
  duration?: number;
  dismissible?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: Toast['type'], message: string, options?: ToastOptions) => string;
  showSuccess: (message: string, options?: ToastOptions) => string;
  showError: (message: string, options?: ToastOptions) => string;
  showInfo: (message: string, options?: ToastOptions) => string;
  showWarning: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const MAX_TOASTS = 5;
const DEFAULT_DURATION = 5000; // 5 seconds

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [timers, setTimers] = useState<Map<string, number>>(new Map());

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));

    // Clear timer if exists
    setTimers(prev => {
      const timer = prev.get(id);
      if (timer) {
        clearTimeout(timer);
        const newTimers = new Map(prev);
        newTimers.delete(id);
        return newTimers;
      }
      return prev;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);

    // Clear all timers
    setTimers(prev => {
      prev.forEach(timer => clearTimeout(timer));
      return new Map();
    });
  }, []);

  const showToast = useCallback((
    type: Toast['type'],
    message: string,
    options: ToastOptions = {}
  ): string => {
    const id = generateId();
    const duration = options.duration ?? DEFAULT_DURATION;
    const dismissible = options.dismissible ?? true;

    const newToast: Toast = {
      id,
      type,
      message,
      duration,
      dismissible,
    };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Remove oldest toasts if we exceed the limit
      if (updated.length > MAX_TOASTS) {
        const toRemove = updated.slice(0, updated.length - MAX_TOASTS);
        toRemove.forEach(toast => {
          const timer = timers.get(toast.id);
          if (timer) clearTimeout(timer);
        });
        return updated.slice(-MAX_TOASTS);
      }
      return updated;
    });

    // Set auto-dismiss timer if duration > 0
    if (duration > 0) {
      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);

      setTimers(prev => new Map(prev).set(id, timer));
    }

    return id;
  }, [generateId, dismiss, timers]);

  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    return showToast('success', message, options);
  }, [showToast]);

  const showError = useCallback((message: string, options?: ToastOptions) => {
    return showToast('error', message, options);
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    return showToast('info', message, options);
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    return showToast('warning', message, options);
  }, [showToast]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [timers]);

  const value: ToastContextType = {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    dismiss,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
