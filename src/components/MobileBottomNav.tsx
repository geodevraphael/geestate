import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MapPin, MessageSquare, ShoppingBag, Plus, Receipt } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function MobileBottomNav() {
  const location = useLocation();
  const { user, hasRole } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Hide on map page to avoid overlapping map controls
  if (location.pathname === '/map') return null;

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

  const isSeller = user && (hasRole('seller') || hasRole('broker') || hasRole('admin'));

  const navItems = [
    { icon: Home, label: 'Home', path: '/', activePattern: /^\/$/  },
    { icon: Search, label: 'Browse', path: '/listings', activePattern: /^\/listings/ },
    { icon: MapPin, label: 'Map', path: '/map', activePattern: /^\/map/ },
    { icon: MessageSquare, label: 'Chat', path: '/messages', activePattern: /^\/messages/, requireAuth: true },
    ...(isSeller ? [{ icon: Receipt, label: 'Fees', path: '/geoinsight-payments', activePattern: /^\/geoinsight-payments/, requireAuth: true }] : []),
  ];

  const canCreateListing = user && (hasRole('seller') || hasRole('broker') || hasRole('admin'));

  return (
    <>
      {/* Floating Action Button for Create - positioned safely above bottom nav, hidden on messages */}
      {canCreateListing && location.pathname !== '/messages' && (
        <Link
          to="/listings/new"
          className="md:hidden fixed right-4 bottom-40 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary to-accent shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] active:scale-95 transition-all duration-300 group"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="h-6 w-6 text-primary-foreground relative z-10" />
          
          {/* Subtle pulse ring */}
          <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-30" style={{ animationDuration: '2s' }} />
        </Link>
      )}

      {/* Main Floating Navigation - Island Design */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        {/* Glass morphism container */}
        <div className="relative overflow-hidden rounded-3xl bg-card/90 backdrop-blur-2xl border border-border/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)]">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          {/* Inner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 pointer-events-none" />
          
          <div className="relative flex items-center justify-around h-16 px-2">
            {navItems.map((item, index) => {
              if (item.requireAuth && !user) return null;
              
              const isActive = item.activePattern.test(location.pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl transition-all duration-300 min-w-[56px] group",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground active:scale-95"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  {/* Active indicator - glowing pill */}
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/15 rounded-2xl animate-scale-in">
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-primary/5 rounded-2xl" />
                    </div>
                  )}
                  
                  <div className="relative z-10">
                    <Icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive && "scale-110 drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                    )} />
                    
                    {/* Message badge */}
                    {item.path === '/messages' && unreadCount > 0 && (
                      <Badge className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center border-2 border-card animate-scale-in">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  <span className={cn(
                    "relative z-10 text-[10px] font-medium transition-all duration-300",
                    isActive ? "font-semibold text-primary" : "group-hover:text-foreground"
                  )}>
                    {item.label}
                  </span>
                  
                  {/* Active dot indicator below label */}
                  {isActive && (
                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_2px_rgba(var(--primary),0.6)] animate-scale-in" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
        
        {/* Bottom safe area spacer for home indicator */}
        <div className="h-safe-area-bottom" />
      </nav>
      
      {/* Extra padding at bottom of page content to not overlap nav */}
      <div className="md:hidden h-24" />
    </>
  );
}