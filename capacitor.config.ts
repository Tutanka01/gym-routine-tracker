import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.routinegym.tracker',
  appName: 'Routine',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
