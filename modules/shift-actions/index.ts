import { requireOptionalNativeModule } from 'expo';

type Native = {
  hasPolicyAccess(): boolean;
  openPolicySettings(): void;
  bluetoothSupported(): boolean;
  schedule(planJson: string): number;
  applyNow(sound: string | null, bluetooth: string | null): string;
};

// null in Expo Go / iOS / web, where the native module does not exist.
const native = requireOptionalNativeModule<Native>('ShiftActions');

export const shiftActionsAvailable = native !== null;
export const hasPolicyAccess = () => native?.hasPolicyAccess() ?? false;
export const openPolicySettings = () => native?.openPolicySettings();
export const bluetoothSupported = () => native?.bluetoothSupported() ?? false;
export const scheduleActions = (planJson: string) => native?.schedule(planJson) ?? 0;
export const applyNow = (sound: string | null, bluetooth: string | null) => native?.applyNow(sound, bluetooth) ?? 'Phone actions need the installed app (not Expo Go).';
