import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  isIOSPWA: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  loading: boolean;
}

// Check if running as iOS PWA (standalone mode)
function isIOSStandalone(): boolean {
  return (
    ('standalone' in window.navigator && (window.navigator as any).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

// Check if iOS Safari
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Check if running in Android
function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isIOSPWA: false,
    isSubscribed: false,
    permission: 'unsupported',
    loading: false,
  });

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    const notificationSupported = 'Notification' in window;
    const iosDevice = isIOS();
    const iosPWA = isIOSStandalone();
    
    // iOS Safari doesn't support Web Push outside of PWA context
    // But iOS 16.4+ supports push in PWA mode
    const pushSupported = 'PushManager' in window;
    const serviceWorkerSupported = 'serviceWorker' in navigator;
    
    // Determine if notifications are supported
    let supported = false;
    let permission: NotificationPermission | 'unsupported' = 'unsupported';
    
    if (notificationSupported) {
      permission = Notification.permission;
      
      if (iosDevice) {
        // iOS only supports notifications in PWA mode (iOS 16.4+)
        supported = iosPWA && pushSupported && serviceWorkerSupported;
      } else {
        // Android and desktop support notifications
        supported = serviceWorkerSupported;
      }
    }
    
    // Check if already subscribed
    let isSubscribed = false;
    if (supported && permission === 'granted' && serviceWorkerSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (pushSupported) {
          const subscription = await registration.pushManager?.getSubscription();
          isSubscribed = !!subscription;
        } else {
          // Fallback: check localStorage for manual subscription flag
          isSubscribed = localStorage.getItem('pushNotificationsEnabled') === 'true';
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    }

    setState({
      isSupported: supported || notificationSupported, // Allow basic notifications even without push
      isIOSPWA: iosPWA,
      isSubscribed,
      permission,
      loading: false,
    });
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Notifications are not supported in this browser');
      return false;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      const result = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission: result }));

      if (result === 'granted') {
        toast.success('Notification permission granted');
        return true;
      } else if (result === 'denied') {
        toast.error('Notification permission denied. Please enable in browser/device settings.');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
      return false;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      // First ensure we have permission
      if (Notification.permission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setState(prev => ({ ...prev, loading: false }));
          return false;
        }
      }

      // For platforms without full Push API support, use local notifications
      const pushSupported = 'PushManager' in window;
      
      if (pushSupported && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // Note: In production, you would use a real VAPID key from your server
          // For now, we'll mark as subscribed and use local notifications
          console.log('Service worker ready for push notifications');
        } catch (error) {
          console.warn('Push subscription failed, falling back to local notifications:', error);
        }
      }

      // Store subscription state locally
      localStorage.setItem('pushNotificationsEnabled', 'true');
      
      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        loading: false,
        permission: 'granted'
      }));
      
      toast.success('Push notifications enabled');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager?.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      localStorage.removeItem('pushNotificationsEnabled');
      
      setState(prev => ({ ...prev, isSubscribed: false, loading: false }));
      toast.success('Push notifications disabled');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable push notifications');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, []);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions) => {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      // Try using service worker notification first (works in background)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const notificationOptions: NotificationOptions & { vibrate?: number[]; requireInteraction?: boolean; badge?: string } = {
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          ...options
        };
        await registration.showNotification(title, notificationOptions);
        return true;
      } else {
        // Fallback to regular Notification API
        new Notification(title, {
          icon: '/icon-192x192.png',
          ...options
        });
        return true;
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      
      // Final fallback: try basic Notification API
      try {
        new Notification(title, {
          icon: '/icon-192x192.png',
          ...options
        });
        return true;
      } catch (e) {
        console.error('All notification methods failed:', e);
        return false;
      }
    }
  }, []);

  // Get helpful message for iOS users
  const getIOSInstructions = useCallback(() => {
    if (!isIOS()) return null;
    
    if (!isIOSStandalone()) {
      return 'To enable notifications on iOS, first add this app to your Home Screen (tap Share → Add to Home Screen), then enable notifications.';
    }
    
    return null;
  }, []);

  return {
    isSupported: state.isSupported,
    isIOSPWA: state.isIOSPWA,
    isSubscribed: state.isSubscribed,
    permission: state.permission,
    loading: state.loading,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
    getIOSInstructions,
    isIOS: isIOS(),
    isAndroid: isAndroid(),
  };
}
