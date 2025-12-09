import { Bell, BellOff, Loader2, CheckCircle2, Smartphone, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function NotificationSettings() {
  const {
    isSupported,
    isIOSPWA,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
    showNotification,
    getIOSInstructions,
    isIOS,
    isAndroid,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const testNotification = async () => {
    const success = await showNotification('Test Notification', {
      body: 'This is a test notification from GeoEstate Tanzania',
      tag: 'test'
    });
    
    if (!success) {
      console.log('Test notification may not have been shown');
    }
  };

  const iosInstructions = getIOSInstructions();

  // iOS not in PWA mode - show instructions
  if (isIOS && !isIOSPWA && !isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Enable Notifications on iOS
          </CardTitle>
          <CardDescription>
            Follow these steps to enable push notifications on your iPhone or iPad.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              To receive notifications on iOS:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Tap the <strong>Share</strong> button in Safari (square with arrow)</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> to install the app</li>
                <li>Open the app from your Home Screen</li>
                <li>Return here to enable notifications</li>
              </ol>
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            iOS requires apps to be installed to the Home Screen before push notifications can be enabled.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Browser doesn't support notifications at all
  if (!isSupported && !('Notification' in window)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser. Try using Chrome, Firefox, Edge, or Safari on a supported device.
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

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Enable Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              {permission === 'denied' 
                ? 'Permission denied. Please enable in device settings.'
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

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            {isIOS 
              ? 'iOS 16.4+ required for push notifications in installed apps.'
              : isAndroid
                ? 'Works best when installed to Home Screen.'
                : 'Notifications work in Chrome, Firefox, Edge, and Safari.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
