import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  variant: 'success' | 'error' | 'info';
}

interface ToastContextValue {
  push: (text: string, variant?: ToastMessage['variant']) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const push = useCallback((text: string, variant: ToastMessage['variant'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, variant }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-lg border bg-white px-4 py-3 text-label-sm shadow-3 ${
              t.variant === 'success'
                ? 'border-primary/20 text-primary-deep'
                : t.variant === 'error'
                ? 'border-error/25 text-error'
                : 'border-border-soft text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined !text-lg">
              {t.variant === 'success' ? 'check_circle' : t.variant === 'error' ? 'error' : 'info'}
            </span>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
