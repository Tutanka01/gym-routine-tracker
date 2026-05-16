/// <reference types="@capacitor/local-notifications" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.routinegym.tracker',
  appName: 'Routine',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    LocalNotifications: {
      presentationOptions: ['banner', 'list', 'sound'],
    },
  },
};

export default config;
