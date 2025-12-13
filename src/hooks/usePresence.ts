import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PresenceState {
  onlineUsers: Set<string>;
  lastSeen: Map<string, string>;
}

export function usePresence(channelName: string = 'global-presence') {
  const { user } = useAuth();
  const [presenceState, setPresenceState] = useState<PresenceState>({
    onlineUsers: new Set(),
    lastSeen: new Map(),
  });

  const isUserOnline = useCallback((userId: string) => {
    return presenceState.onlineUsers.has(userId);
  }, [presenceState.onlineUsers]);

  const getLastSeen = useCallback((userId: string): string | null => {
    return presenceState.lastSeen.get(userId) || null;
  }, [presenceState.lastSeen]);

  const formatLastSeen = useCallback((lastSeenTime: string | null): string => {
    if (!lastSeenTime) return 'Offline';
    
    const now = new Date();
    const lastSeen = new Date(lastSeenTime);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineUsers = new Set<string>();
        const lastSeen = new Map<string, string>();

        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.user_id) {
              onlineUsers.add(presence.user_id);
              lastSeen.set(presence.user_id, new Date().toISOString());
            }
          });
        });

        setPresenceState({ onlineUsers, lastSeen });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setPresenceState(prev => {
          const newOnlineUsers = new Set(prev.onlineUsers);
          const newLastSeen = new Map(prev.lastSeen);
          
          newPresences.forEach((presence: any) => {
            if (presence.user_id) {
              newOnlineUsers.add(presence.user_id);
              newLastSeen.set(presence.user_id, new Date().toISOString());
            }
          });

          return { onlineUsers: newOnlineUsers, lastSeen: newLastSeen };
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setPresenceState(prev => {
          const newOnlineUsers = new Set(prev.onlineUsers);
          const newLastSeen = new Map(prev.lastSeen);
          
          leftPresences.forEach((presence: any) => {
            if (presence.user_id) {
              newOnlineUsers.delete(presence.user_id);
              newLastSeen.set(presence.user_id, new Date().toISOString());
            }
          });

          return { onlineUsers: newOnlineUsers, lastSeen: newLastSeen };
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    // Update presence every 30 seconds to keep alive
    const interval = setInterval(() => {
      channel.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
      });
    }, 30000);

    return () => {
      clearInterval(interval);
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user?.id, channelName]);

  return {
    isUserOnline,
    getLastSeen,
    formatLastSeen,
    onlineCount: presenceState.onlineUsers.size,
  };
}
