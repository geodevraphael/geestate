import { Bell, BellOff, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    showNotification
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const testNotification = async () => {
    await showNotification('Test Notification', {
      body: 'This is a test notification from GeoEstate Tanzania',
      tag: 'test'
    });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser. Try using Chrome, Firefox, or Edge on a desktop or Android device.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive notifications about messages, listings, and important updates even when the app is closed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Enable Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'denied' 
                ? 'Permission denied. Please enable in browser settings.'
                : isSubscribed 
                  ? 'You will receive push notifications'
                  : 'Enable to receive notifications'
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubscribed && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={loading || permission === 'denied'}
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
          <p className="text-sm text-destructive">
            Notifications are blocked. To enable, click the lock icon in your browser's address bar and allow notifications.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
