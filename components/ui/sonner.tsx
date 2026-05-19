'use client';

import { useTheme } from 'next-themes';
import { motion } from 'motion/react';
import {
  Toaster as SonnerToaster,
  toast as sonnerToast,
  type ToastT,
} from 'sonner';
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'error' | 'warning';

interface CustomToastProps {
  id: string | number;
  title?: string;
  message: string;
  variant?: Variant;
  onDismiss?: () => void;
  /** Optional action button (e.g. "Retry") */
  action?: { label: string; onClick: () => void };
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-white border-gray-300',
  success: 'bg-white border-green-500',
  error: 'bg-white border-red-500',
  warning: 'bg-white border-amber-500',
};

const titleColor: Record<Variant, string> = {
  default: 'text-gray-700',
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
};

const messageColor: Record<Variant, string> = {
  default: 'text-gray-600',
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-600',
};

const iconColor: Record<Variant, string> = {
  default: 'text-gray-500',
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
};

const variantIcons: Record<Variant, React.ComponentType<{ className?: string }>> = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const toastAnimation = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 50, scale: 0.95 },
};

function CustomToast({ id, title, message, variant = 'default', onDismiss, action }: CustomToastProps) {
  const Icon = variantIcons[variant];

  return (
    <motion.div
      variants={toastAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex items-center justify-between w-full max-w-xs p-3 rounded-xl border shadow-md',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', iconColor[variant])} />
        <div className="space-y-0.5 min-w-0 flex-1">
          {title && (
            <h3 className={cn('text-xs font-medium leading-none', titleColor[variant])}>
              {title}
            </h3>
          )}
          <p className={cn('text-xs', messageColor[variant])}>{message}</p>
          {action && (
            <button
              type="button"
              onClick={() => {
                sonnerToast.dismiss(id);
                action.onClick();
              }}
              className={cn(
                'mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                variant === 'error' && 'bg-red-600 text-white hover:bg-red-700',
                variant === 'success' && 'bg-green-600 text-white hover:bg-green-700',
                variant === 'warning' && 'bg-amber-600 text-white hover:bg-amber-700',
                (variant === 'default' || !variant) && 'bg-primary text-primary-foreground hover:opacity-90'
              )}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => {
          sonnerToast.dismiss(id);
          onDismiss?.();
        }}
        className="rounded-full p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring ml-2 shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="h-3 w-3 text-muted-foreground" />
      </button>
    </motion.div>
  );
}

// Custom toast function that wraps sonner
const toast = {
  default: (message: string, options?: { title?: string; duration?: number; onDismiss?: () => void }) => {
    return sonnerToast.custom(
      (id) => (
        <CustomToast
          id={id}
          message={message}
          title={options?.title}
          variant="default"
          onDismiss={options?.onDismiss}
        />
      ),
      { duration: options?.duration ?? 4000 }
    );
  },
  success: (message: string, options?: { title?: string; duration?: number; onDismiss?: () => void }) => {
    return sonnerToast.custom(
      (id) => (
        <CustomToast
          id={id}
          message={message}
          title={options?.title}
          variant="success"
          onDismiss={options?.onDismiss}
        />
      ),
      { duration: options?.duration ?? 4000 }
    );
  },
  error: (message: string, options?: { title?: string; duration?: number; onDismiss?: () => void; action?: { label: string; onClick: () => void } }) => {
    return sonnerToast.custom(
      (id) => (
        <CustomToast
          id={id}
          message={message}
          title={options?.title}
          variant="error"
          onDismiss={options?.onDismiss}
          action={options?.action}
        />
      ),
      { duration: options?.duration ?? 5000 }
    );
  },
  warning: (message: string, options?: { title?: string; duration?: number; onDismiss?: () => void }) => {
    return sonnerToast.custom(
      (id) => (
        <CustomToast
          id={id}
          message={message}
          title={options?.title}
          variant="warning"
          onDismiss={options?.onDismiss}
        />
      ),
      { duration: options?.duration ?? 4000 }
    );
  },
  info: (message: string, options?: { title?: string; duration?: number; onDismiss?: () => void }) => {
    return sonnerToast.custom(
      (id) => (
        <CustomToast
          id={id}
          message={message}
          title={options?.title}
          variant="default"
          onDismiss={options?.onDismiss}
        />
      ),
      { duration: options?.duration ?? 4000 }
    );
  },
  // For direct custom toast calls
  custom: sonnerToast.custom,
  dismiss: sonnerToast.dismiss,
};

// Toaster component
const Toaster = () => {
  const { theme = 'system' } = useTheme();

  return (
    <SonnerToaster
      theme={theme as 'light' | 'dark' | 'system'}
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        className: 'flex justify-end',
      }}
    />
  );
};

export { Toaster, toast };
