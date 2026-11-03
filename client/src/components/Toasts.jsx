import { createContext, useCallback, useContext, useState } from 'react';
import { CircleCheck, CircleX, Info, X } from 'lucide-react';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

const STYLES = {
  success: { icon: CircleCheck, cls: 'text-emerald-300' },
  error: { icon: CircleX, cls: 'text-rose-300' },
  info: { icon: Info, cls: 'text-cyan-300' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6" aria-live="polite">
        {toasts.map(({ id, message, type }) => {
          const { icon: Icon, cls } = STYLES[type] || STYLES.info;
          return (
            <div key={id} className="toast-in glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-navy-800/80 px-4 py-3 text-sm">
              <Icon className={`mt-0.5 size-4 shrink-0 ${cls}`} />
              <p className="flex-1 text-slate-100">{message}</p>
              <button onClick={() => dismiss(id)} className="text-slate-400 hover:text-white" aria-label="Dismiss"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
