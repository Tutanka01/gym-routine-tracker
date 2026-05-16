import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { STORAGE_KEY_LIST } from './storageKeys';

const REST_NOTIFICATION_ID = 9001;
const STORAGE_KEY_SET = new Set<string>(STORAGE_KEY_LIST);

export const isNativeApp = () => Capacitor.isNativePlatform();

const canUseBrowserStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export async function hydrateNativeStorage() {
  if (!isNativeApp() || !canUseBrowserStorage()) return;

  await Promise.all(
    STORAGE_KEY_LIST.map(async key => {
      try {
        const localValue = localStorage.getItem(key);
        const nativeValue = await Preferences.get({ key });

        if (localValue == null && nativeValue.value != null) {
          localStorage.setItem(key, nativeValue.value);
        } else if (localValue != null && nativeValue.value == null) {
          await Preferences.set({ key, value: localValue });
        }
      } catch (e) {
        console.warn('native storage hydrate failed', key, e);
      }
    }),
  );
}

export async function mirrorNativeStorageWrite(key: string, value: string) {
  if (!isNativeApp() || !STORAGE_KEY_SET.has(key)) return;
  try {
    await Preferences.set({ key, value });
  } catch (e) {
    console.warn('native storage write failed', key, e);
  }
}

export async function mirrorNativeStorageRemove(key: string) {
  if (!isNativeApp() || !STORAGE_KEY_SET.has(key)) return;
  try {
    await Preferences.remove({ key });
  } catch (e) {
    console.warn('native storage remove failed', key, e);
  }
}

export async function signalSetComplete() {
  if (isNativeApp()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      return;
    } catch {}
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([40, 50, 40, 50, 120]);
  }
}

export async function signalRestFinished(vibrate: boolean) {
  if (!vibrate) return;

  if (isNativeApp()) {
    try {
      await Haptics.notification({ type: NotificationType.Success });
      return;
    } catch {}
  }

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([180, 80, 180, 80, 280]);
  }
}

async function ensureNotificationPermission() {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  if (current.display === 'denied') return false;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === 'granted';
}

export async function scheduleRestNotification(seconds: number) {
  if (!isNativeApp() || seconds <= 0) return;

  try {
    await cancelRestNotification();
    const granted = await ensureNotificationPermission();
    if (!granted) return;

    await LocalNotifications.schedule({
      notifications: [{
        id: REST_NOTIFICATION_ID,
        title: 'Repos termine',
        body: 'Tu peux reprendre ta seance.',
        schedule: {
          at: new Date(Date.now() + seconds * 1000),
          allowWhileIdle: true,
        },
        interruptionLevel: 'active',
        extra: { kind: 'rest-timer' },
      }],
    });
  } catch (e) {
    console.warn('rest notification schedule failed', e);
  }
}

export async function cancelRestNotification() {
  if (!isNativeApp()) return;

  try {
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIFICATION_ID }] });
  } catch (e) {
    console.warn('rest notification cancel failed', e);
  }
}

export async function shareBackupFile(filename: string, data: string) {
  if (!isNativeApp()) return false;

  try {
    const saved = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });

    await Share.share({
      title: 'Sauvegarde Routine',
      text: 'Sauvegarde JSON de Routine.',
      url: saved.uri,
      dialogTitle: 'Exporter la sauvegarde',
    });

    return true;
  } catch (e) {
    console.warn('native backup share failed', e);
    return false;
  }
}
