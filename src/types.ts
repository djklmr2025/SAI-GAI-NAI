export interface VirtualApp {
  id: string;
  name: string;
  packageName: string;
  icon: string;
  version: string;
  status: 'installed' | 'running' | 'stopped';
  lastUsed: number;
  type?: 'native' | 'web';
  webUrl?: string;
}

export interface VirtualDevice {
  id: string;
  userId: string;
  model: string;
  osVersion: string;
  battery: number;
  isLocked: boolean;
  installedApps: VirtualApp[];
  screenBrightness: number;
  volume: number;
  formFactor?: 'phone' | 'tablet';
  orientation?: 'portrait' | 'landscape';
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: number;
  isDj?: boolean;
  arkaiosId?: string;
  digitalName?: string;
}
