import { createContext, useContext, useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const Ctx = createContext(null);
let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const h = timers.current.get(id);
    if (h) {
      clearTimeout(h);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, type = 'info', ms = 3600) => {
      const id = ++nextId;
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms),
      );
      return id;
    },
    [dismiss],
  );

  const toast = useCallback(
    Object.assign((m, type) => push(m, type), {
      success: (m) => push(m, 'ok'),
      error: (m) => push(m, 'error', 5000),
      info: (m) => push(m, 'info'),
    }),
    [push],
  );

  return (
    <Ctx.Provider value={{ toast, dismiss }}>
      {children}
      <div className="toaster" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={`toast toast-${t.type}`}
              onClick={() => dismiss(t.id)}
              role="status"
            >
              <span aria-hidden style={{ fontSize: '0.95rem' }}>
                {t.type === 'ok' ? '✓' : t.type === 'error' ? '⚠' : 'ℹ'}
              </span>
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
