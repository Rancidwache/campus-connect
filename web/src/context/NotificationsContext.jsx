import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useRealtime } from './RealtimeContext.jsx';

const Ctx = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const { on } = useRealtime();
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    try {
      const res = await api.get('/notifications');
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      /* ignore transient errors */
    }
  }, [user]);

  const markRead = useCallback(
    async (ids) => {
      await api.post('/notifications/read', ids ? { ids } : {});
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
    if (user) {
      // Poll as a fallback; the socket delivers new notifications instantly.
      timer.current = setInterval(refresh, 25_000);
      return () => clearInterval(timer.current);
    }
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return undefined;
    return on('notification:new', (n) => {
      setItems((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 30));
      setUnreadCount((c) => c + 1);
    });
  }, [user, on]);

  return (
    <Ctx.Provider value={{ items, unreadCount, refresh, markRead }}>{children}</Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
