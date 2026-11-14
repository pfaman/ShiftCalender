import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { makeBackup, parseBackup } from './core/backup';
import { Store } from './core/store';

export async function exportBackup(state: Store): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `shiftcalendar-backup-${stamp}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(makeBackup(state), null, 2));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Shift Calendar backup' });
}

// Resolves to null if the user cancels the picker. Throws with a readable message on a bad file.
export async function pickBackup(): Promise<Store | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled) return null;
  const text = await new File(res.assets[0].uri).text();
  return parseBackup(text);
}
