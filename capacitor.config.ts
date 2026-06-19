import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aperturesync.app',
  appName: 'ApertureSync',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
