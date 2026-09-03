import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const Ctx = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
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
      timer.current = setInterval(refresh, 25_000);
      return () => clearInterval(timer.current);
    }
  }, [user, refresh]);

  return (
    <Ctx.Provider value={{ items, unreadCount, refresh, markRead }}>{children}</Ctx.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
