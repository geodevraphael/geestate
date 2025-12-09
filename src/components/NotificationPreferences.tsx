import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Home, 
  ShieldCheck, 
  CreditCard, 
  Calendar, 
  AlertTriangle,
  Settings,
  Bell
} from 'lucide-react';

interface NotificationPreference {
  messages: boolean;
  listings: boolean;
  verification: boolean;
  payment: boolean;
  visits: boolean;
  disputes: boolean;
  system: boolean;
  push_enabled: boolean;
}

const defaultPreferences: NotificationPreference = {
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

export function NotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreference>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check push notification support
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        
        if (data?.notification_preferences) {
          setPreferences({
            ...defaultPreferences,
            ...(data.notification_preferences as Partial<NotificationPreference>),
          });
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  const handleToggle = (key: keyof NotificationPreference) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const requestPushPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        setPreferences(prev => ({ ...prev, push_enabled: true }));
        toast.success('Push notifications enabled!');
      } else if (permission === 'denied') {
        toast.error('Push notifications blocked. Enable in browser settings.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
    }
  };

  const savePreferences = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          notification_preferences: preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications Section */}
      {pushSupported && (
        <div className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label className="font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications even when the app is closed
                </p>
              </div>
            </div>
            {pushPermission === 'granted' ? (
              <Switch
                checked={preferences.push_enabled}
                onCheckedChange={() => handleToggle('push_enabled')}
              />
            ) : pushPermission === 'denied' ? (
              <span className="text-xs text-destructive">Blocked</span>
            ) : (
              <Button size="sm" variant="outline" onClick={requestPushPermission}>
                Enable
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Notification Types */}
      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Notification Types</p>
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
              onCheckedChange={() => handleToggle(key)}
            />
          </div>
        ))}
      </div>

      <Button onClick={savePreferences} disabled={saving} className="w-full sm:w-auto">
        {saving ? 'Saving...' : 'Save Preferences'}
      </Button>
    </div>
  );
}
