import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useRealtime } from './RealtimeContext.jsx';

const Ctx = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { on } = useRealtime();
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const { unread: n } = await api.get('/messages/unread-count');
      setUnread(n);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user) return undefined;
    const offNew = on('message:new', () => setUnread((c) => c + 1));
    const offRead = on('message:delivered', () => refresh());
    return () => {
      offNew();
      offRead();
    };
  }, [user, on, refresh]);

  return <Ctx.Provider value={{ unread, refresh }}>{children}</Ctx.Provider>;
}

export function useChat() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useChat must be used inside <ChatProvider>');
  return ctx;
}
