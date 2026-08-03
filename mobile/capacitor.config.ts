import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.expenseos.app',
  appName: 'ExpenseOS',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'expense-os.firebaseapp.com',
      '*.firebaseapp.com',
      'accounts.google.com',
      '*.google.com',
      '*.googleapis.com',
      '*.googleusercontent.com'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#090C11',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '923139726274-33t8og8rjfb9dv5muh0k8o288dausoht.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
