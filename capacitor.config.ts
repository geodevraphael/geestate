import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.05e23931d3304150b5da005afd7a7da4',
  appName: 'GeoBlockEstate',
  webDir: 'dist',
  server: {
    url: 'https://05e23931-d330-4150-b5da-005afd7a7da4.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: true
  }
};

export default config;
