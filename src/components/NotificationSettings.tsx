import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, CheckCircle2, Smartphone, Info, Save, MessageSquare, Home, ShieldCheck, CreditCard, Calendar, AlertTriangle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationPreferences {
  messages: boolean;
  listings: boolean;
  verification: boolean;
  payment: boolean;
  visits: boolean;
  disputes: boolean;
  system: boolean;
  push_enabled: boolean;
}

const defaultPreferences: NotificationPreferences = {
  messages: true,
  listings: true,
  verification: true,
  payment: true,
  visits: true,
  disputes: true,
  system: true,
  push_enabled: false,
};

const preferenceConfig = [
  { key: 'messages', label: 'Messages', description: 'New messages from buyers or sellers', icon: MessageSquare },
  { key: 'listings', label: 'Listings', description: 'Updates about your listings', icon: Home },
  { key: 'verification', label: 'Verification', description: 'Listing verification status changes', icon: ShieldCheck },
  { key: 'payment', label: 'Payments', description: 'Payment confirmations and reminders', icon: CreditCard },
  { key: 'visits', label: 'Visits', description: 'Visit request updates', icon: Calendar },
  { key: 'disputes', label: 'Disputes', description: 'Dispute notifications', icon: AlertTriangle },
  { key: 'system', label: 'System', description: 'Important system announcements', icon: Settings },
] as const;

export function NotificationSettings() {
  const { user } = useAuth();
  const {
    isSupported,
    isIOSPWA,
    isSubscribed,
    permission,
    loading: pushLoading,
    subscribe,
    unsubscribe,
    showNotification,
    getIOSInstructions,
    isIOS,
    isAndroid,
  } = usePushNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPreferences, setInitialPreferences] = useState<NotificationPreferences>(defaultPreferences);

  // Load preferences from database on mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const savedPrefs = data?.notification_preferences;
        if (savedPrefs && typeof savedPrefs === 'object' && !Array.isArray(savedPrefs)) {
          const prefsObj = savedPrefs as Record<string, unknown>;
          const mergedPrefs: NotificationPreferences = {
            messages: typeof prefsObj.messages === 'boolean' ? prefsObj.messages : defaultPreferences.messages,
            listings: typeof prefsObj.listings === 'boolean' ? prefsObj.listings : defaultPreferences.listings,
            verification: typeof prefsObj.verification === 'boolean' ? prefsObj.verification : defaultPreferences.verification,
            payment: typeof prefsObj.payment === 'boolean' ? prefsObj.payment : defaultPreferences.payment,
            visits: typeof prefsObj.visits === 'boolean' ? prefsObj.visits : defaultPreferences.visits,
            disputes: typeof prefsObj.disputes === 'boolean' ? prefsObj.disputes : defaultPreferences.disputes,
            system: typeof prefsObj.system === 'boolean' ? prefsObj.system : defaultPreferences.system,
            push_enabled: isSubscribed,
          };
          setPreferences(mergedPrefs);
          setInitialPreferences(mergedPrefs);
        } else {
          // No saved preferences, use defaults with current push state
          const newPrefs = { ...defaultPreferences, push_enabled: isSubscribed };
          setPreferences(newPrefs);
          setInitialPreferences(newPrefs);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
        toast.error('Failed to load notification preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id, isSubscribed]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(preferences) !== JSON.stringify(initialPreferences);
    setHasChanges(changed);
  }, [preferences, initialPreferences]);

  const handlePreferenceToggle = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePushToggle = async () => {
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        setPreferences(prev => ({ ...prev, push_enabled: false }));
      }
    } else {
      const success = await subscribe();
      if (success) {
        setPreferences(prev => ({ ...prev, push_enabled: true }));
      }
    }
  };

  const savePreferences = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save preferences');
      return;
    }

    setSaving(true);
    try {
      // Convert to plain object for JSON storage
      const prefsToSave: Record<string, boolean> = {
        messages: preferences.messages,
        listings: preferences.listings,
        verification: preferences.verification,
        payment: preferences.payment,
        visits: preferences.visits,
        disputes: preferences.disputes,
        system: preferences.system,
        push_enabled: preferences.push_enabled,
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: prefsToSave,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setInitialPreferences(preferences);
      setHasChanges(false);
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async () => {
    const success = await showNotification('Test Notification', {
      body: 'This is a test notification from GeoEstate Tanzania',
      tag: 'test'
    });
    
    if (success) {
      toast.success('Test notification sent');
    } else {
      toast.error('Failed to send test notification');
    }
  };

  const iosInstructions = getIOSInstructions();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how and when you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Push Notifications</h3>
          </div>

          {/* iOS not in PWA mode - show instructions */}
          {isIOS && !isIOSPWA && !isSupported && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                To receive notifications on iOS:
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                  <li>Tap the <strong>Share</strong> button in Safari</li>
                  <li>Tap <strong>"Add to Home Screen"</strong></li>
                  <li>Open the app from your Home Screen</li>
                  <li>Return here to enable notifications</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}

          {/* Browser doesn't support notifications */}
          {!isSupported && !('Notification' in window) && (
            <Alert>
              <BellOff className="h-4 w-4" />
              <AlertDescription>
                Push notifications are not supported in this browser. Try using Chrome, Firefox, Edge, or Safari.
              </AlertDescription>
            </Alert>
          )}

          {/* Show push notification toggle if supported */}
          {(isSupported || 'Notification' in window) && (
            <>
              {iosInstructions && (
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>{iosInstructions}</AlertDescription>
                </Alert>
              )}

              {isAndroid && !isSubscribed && permission !== 'denied' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    For the best experience on Android, add this app to your Home Screen for reliable notifications.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="font-medium cursor-pointer">
                    Enable Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {permission === 'denied'
                      ? 'Permission denied. Please enable in device settings.'
                      : isSubscribed
                        ? 'You will receive push notifications'
                        : 'Receive notifications even when the app is closed'
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {pushLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubscribed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  <Switch
                    id="push-notifications"
                    checked={isSubscribed}
                    onCheckedChange={handlePushToggle}
                    disabled={pushLoading || permission === 'denied'}
                  />
                </div>
              </div>

              {isSubscribed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testNotification}
                  className="w-full"
                >
                  Send Test Notification
                </Button>
              )}

              {permission === 'denied' && (
                <Alert variant="destructive">
                  <BellOff className="h-4 w-4" />
                  <AlertDescription>
                    {isIOS
                      ? 'Notifications are blocked. Go to Settings → Notifications → GeoEstate and enable notifications.'
                      : isAndroid
                        ? 'Notifications are blocked. Go to Settings → Apps → GeoEstate → Notifications and enable them.'
                        : 'Notifications are blocked. Click the lock/info icon in your browser\'s address bar and allow notifications.'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* Notification Types Section */}
        <div className="space-y-4">
          <h3 className="font-medium text-muted-foreground">Notification Types</h3>
          {preferenceConfig.map(({ key, label, description, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label htmlFor={key} className="font-medium cursor-pointer">
                    {label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                id={key}
                checked={preferences[key]}
                onCheckedChange={() => handlePreferenceToggle(key)}
              />
            </div>
          ))}
        </div>

        <Separator />

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
          </p>
          <Button
            onClick={savePreferences}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
