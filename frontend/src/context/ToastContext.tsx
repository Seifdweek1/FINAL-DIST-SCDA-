import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

export type ToastVariant = 'success' | 'danger' | 'info' | 'warning';

type ToastItem = {
  id: number;
  title: string;
  body?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  showToast: (title: string, body?: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((title: string, body?: string, variant: ToastVariant = 'info') => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, title, body, variant }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer className="p-3" position="top-end">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            bg="dark"
            onClose={() => dismiss(t.id)}
            className={`mb-2 ${
              t.variant === 'success'
                ? 'border border-success'
                : t.variant === 'danger'
                  ? 'border border-danger'
                  : t.variant === 'warning'
                    ? 'border border-warning'
                    : 'border border-primary'
            }`}
          >
            <Toast.Header closeButton>
              <strong className="me-auto">{t.title}</strong>
            </Toast.Header>
            {t.body ? <Toast.Body className="text-secondary">{t.body}</Toast.Body> : null}
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
