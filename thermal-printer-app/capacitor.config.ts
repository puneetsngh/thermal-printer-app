import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.thermalprinter',
  appName: 'Thermal Printer Demo',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    PrivacyScreen: {
      enable: true
    },
    SplashScreen: {
      launchShowDuration: 2000
    },
    BluetoothSerial: {
      displayStrings: {
        scanning: 'Searching for printers...',
        cancel: 'Cancel',
        availableDevices: 'Available Printers',
        noDevices: 'No printers found'
      }
    }
  },
  cordova: {
    preferences: {
      DisableDeploy: 'true',
      ScrollEnabled: 'false',
      BackupWebStorage: 'none',
      SplashMaintainAspectRatio: 'true',
      FadeSplashScreenDuration: '300',
      SplashShowOnlyFirstTime: 'false',
      SplashScreen: 'screen',
      ShowSplashScreenSpinner: 'false'
    }
  }
};

export default config;
