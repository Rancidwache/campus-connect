import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const KEY = 'cc_theme'; // 'light' | 'dark' | 'system'
const Ctx = createContext(null);

function apply(mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(read);

  useEffect(() => {
    apply(mode);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* private mode */
    }
  }, [mode]);

  // Re-evaluate the resolved theme label when the OS setting changes under "system".
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  const cycle = useCallback(() => {
    setMode((m) => (m === 'light' ? 'dark' : m === 'dark' ? 'system' : 'light'));
  }, []);

  return (
    <Ctx.Provider value={{ mode, resolved, setMode, cycle }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
