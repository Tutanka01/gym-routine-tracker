export const STORAGE_KEYS = {
  sessions: 'gym.sessions.v1',
  checkins: 'gym.checkins.v1',
  active: 'gym.active.v1',
  settings: 'gym.settings.v1',
  program: 'gym.program.v1',
} as const;

export const STORAGE_KEY_LIST = Object.values(STORAGE_KEYS);
