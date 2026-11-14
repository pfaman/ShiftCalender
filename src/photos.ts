import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

// Returns a photo copied into the app's own storage, or null if cancelled / not allowed.
export async function pickPhoto(source: 'camera' | 'gallery', dateKey: string): Promise<string | null> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? 'Camera permission is needed to take a photo.' : 'Photo access is needed to pick a picture.');
  const opts = { mediaTypes: ['images' as const], quality: 0.7 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled) return null;
  const dest = new File(Paths.document, `note-${dateKey}-${Date.now()}.jpg`);
  new File(res.assets[0].uri).copy(dest);
  return dest.uri;
}

export function deletePhoto(uri: string): void {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}
