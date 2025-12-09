import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Bell, MessageSquare, Home, ShieldCheck, CreditCard, Calendar, AlertTriangle, Settings, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Notification as AppNotification } from '@/types/database';
import { format } from 'date-fns';

// Simple push notification helper
const showBrowserNotification = async (title: string, body: string, url?: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          data: { url: url || '/' },
          tag: `notification-${Date.now()}`
        });
      } else {
        new window.Notification(title, {
          body,
          icon: '/icon-192x192.png'
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new_message':
      return MessageSquare;
    case 'listing_verified':
      return ShieldCheck;
    case 'payment_proof_submitted':
      return CreditCard;
    case 'visit_requested':
      return Calendar;
    case 'dispute_opened':
    case 'new_dispute':
      return AlertTriangle;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'new_message':
      return 'text-blue-500';
    case 'listing_verified':
      return 'text-green-500';
    case 'payment_proof_submitted':
      return 'text-purple-500';
    case 'visit_requested':
      return 'text-cyan-500';
    case 'dispute_opened':
    case 'new_dispute':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as AppNotification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
          
          // Show browser push notification
          showBrowserNotification(
            newNotification.title,
            newNotification.message,
            newNotification.link_url || undefined
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleNotificationClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.link_url) {
      navigate(notification.link_url);
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative group hover:bg-primary/10 transition-all duration-200"
        >
          <Bell className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 opacity-75" />
              <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0 overflow-hidden" sideOffset={8}>
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto px-2 py-1 text-xs text-primary hover:text-primary/80 hover:bg-primary/10" 
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
            >
              View All
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="p-4 rounded-full bg-muted mb-4">
                <Bell className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);
              
              return (
                <div key={notification.id}>
                  <DropdownMenuItem
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer focus:bg-muted/50 transition-colors ${
                      !notification.is_read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex gap-3 w-full">
                      <div className={`flex-shrink-0 p-2 rounded-lg bg-muted ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-tight ${
                            !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-2">
                          {format(new Date(notification.created_at), 'MMM dd, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                  {index < notifications.length - 1 && (
                    <div className="mx-4">
                      <DropdownMenuSeparator className="my-0" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {notifications.length > 0 && (
          <div className="border-t border-border p-3 bg-muted/30">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
            >
              <Settings className="h-3 w-3 mr-2" />
              Manage Notification Preferences
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
