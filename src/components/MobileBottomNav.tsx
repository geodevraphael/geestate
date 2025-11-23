import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MapPin, MessageSquare, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id')
        .eq('receiver_id', user.id)
        .eq('is_read', false);

      setUnreadCount(data?.length || 0);
    };

    fetchUnreadCount();

    // Subscribe to new messages
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navItems = [
    { icon: Home, label: 'Home', path: '/', activePattern: /^\/$/  },
    { icon: Search, label: 'Listings', path: '/listings', activePattern: /^\/listings/ },
    { icon: MapPin, label: 'Map', path: '/map', activePattern: /^\/map/ },
    { icon: MessageSquare, label: 'Messages', path: '/messages', activePattern: /^\/messages/, requireAuth: true },
    { icon: ShoppingBag, label: 'My Deals', path: '/deals', activePattern: /^\/deals/, requireAuth: true },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-around h-[72px] px-1">
        {navItems.map((item) => {
          if (item.requireAuth && !user) return null;
          
          const isActive = item.activePattern.test(location.pathname);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-2.5 py-2 rounded-2xl transition-all duration-300 min-w-[64px] relative touch-feedback",
                isActive 
                  ? "text-primary bg-primary/15 scale-105" 
                  : "text-muted-foreground active:bg-muted/30"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-[22px] w-[22px] transition-transform",
                  isActive && "scale-110"
                )} />
                {item.path === '/messages' && unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-[18px] min-w-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium mt-0.5",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
