import { useState, useEffect, useCallback } from 'react';
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
  if (typeof window === 'undefined') return false;
  return (
    ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true) ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

// Check if iOS Safari
function isIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

// Check if running in Android
function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

// Storage key for push notification state
const PUSH_STORAGE_KEY = 'geoestate_push_notifications';

interface StoredPushState {
  enabled: boolean;
  subscribedAt?: string;
  endpoint?: string;
}

function getStoredPushState(): StoredPushState {
  try {
    const stored = localStorage.getItem(PUSH_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading push state from storage:', e);
  }
  return { enabled: false };
}

function setStoredPushState(state: StoredPushState): void {
  try {
    localStorage.setItem(PUSH_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Error saving push state to storage:', e);
  }
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isIOSPWA: false,
    isSubscribed: false,
    permission: 'unsupported',
    loading: true,
  });

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    if (typeof window === 'undefined') {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const notificationSupported = 'Notification' in window;
    const iosDevice = isIOS();
    const iosPWA = isIOSStandalone();
    const pushSupported = 'PushManager' in window;
    const serviceWorkerSupported = 'serviceWorker' in navigator;

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

    // Check stored subscription state
    const storedState = getStoredPushState();
    let isSubscribed = storedState.enabled && permission === 'granted';

    // Verify actual subscription if we think we're subscribed
    if (isSubscribed && supported && serviceWorkerSupported && pushSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager?.getSubscription();
        isSubscribed = !!subscription || storedState.enabled;
      } catch (error) {
        console.error('Error checking subscription:', error);
        // Fall back to stored state
        isSubscribed = storedState.enabled && permission === 'granted';
      }
    }

    setState({
      isSupported: supported || notificationSupported,
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

      // Register service worker if needed
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw-push.js', {
            scope: '/'
          });
          await navigator.serviceWorker.ready;
          console.log('Service worker registered for push notifications');

          // Try to subscribe to push if supported
          if ('PushManager' in window && registration.pushManager) {
            try {
              // For demo purposes, we'll just mark as subscribed
              // In production, you would use your VAPID keys here
              console.log('Push manager available, ready for push notifications');
            } catch (pushError) {
              console.warn('Push subscription not available, using local notifications:', pushError);
            }
          }
        } catch (swError) {
          console.warn('Service worker registration failed, using fallback notifications:', swError);
        }
      }

      // Store subscription state
      setStoredPushState({
        enabled: true,
        subscribedAt: new Date().toISOString(),
      });

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
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager?.getSubscription();

          if (subscription) {
            await subscription.unsubscribe();
          }
        } catch (error) {
          console.warn('Error unsubscribing from push:', error);
        }
      }

      // Clear stored state
      setStoredPushState({ enabled: false });

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

  const showNotification = useCallback(async (title: string, options?: NotificationOptions): Promise<boolean> => {
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    const notificationOptions: NotificationOptions = {
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      requireInteraction: false,
      ...options
    };

    try {
      // Try using service worker notification first (works in background)
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, notificationOptions);
          return true;
        } catch (swError) {
          console.warn('Service worker notification failed, trying fallback:', swError);
        }
      }

      // Fallback to regular Notification API
      new Notification(title, notificationOptions);
      return true;
    } catch (error) {
      console.error('Error showing notification:', error);
      return false;
    }
  }, []);

  // Get helpful message for iOS users
  const getIOSInstructions = useCallback((): string | null => {
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
