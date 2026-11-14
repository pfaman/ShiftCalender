package expo.modules.shiftactions

import android.app.NotificationManager
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.media.AudioManager
import android.os.Build

object PhoneActions {
  // Returns a short description of what happened, for the test buttons.
  fun apply(context: Context, sound: String?, bluetooth: String?): String {
    val notes = mutableListOf<String>()
    if (!sound.isNullOrEmpty()) notes += applySound(context, sound)
    if (!bluetooth.isNullOrEmpty()) notes += applyBluetooth(context, bluetooth)
    return notes.joinToString("; ")
  }

  private fun applySound(context: Context, mode: String): String {
    val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val ringer = when (mode) {
      "sound" -> AudioManager.RINGER_MODE_NORMAL
      "vibrate" -> AudioManager.RINGER_MODE_VIBRATE
      "silent" -> AudioManager.RINGER_MODE_SILENT
      else -> return "unknown sound mode"
    }
    // Android blocks silent mode (and leaving it) unless Do Not Disturb access was granted.
    if (ringer == AudioManager.RINGER_MODE_SILENT && !nm.isNotificationPolicyAccessGranted) {
      return try {
        audio.ringerMode = AudioManager.RINGER_MODE_VIBRATE
        "no Do Not Disturb access, used vibrate instead of silent"
      } catch (e: SecurityException) {
        "no Do Not Disturb access"
      }
    }
    return try {
      audio.ringerMode = ringer
      "sound mode $mode"
    } catch (e: SecurityException) {
      "sound mode blocked (Do Not Disturb access needed)"
    }
  }

  // Apps can only switch Bluetooth on Android 12 (API 32) and older.
  @Suppress("DEPRECATION", "MissingPermission")
  private fun applyBluetooth(context: Context, mode: String): String {
    if (Build.VERSION.SDK_INT > 32) return "bluetooth switching is not allowed on this Android version"
    return try {
      val adapter: BluetoothAdapter? =
        if (Build.VERSION.SDK_INT >= 31) {
          (context.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
        } else {
          BluetoothAdapter.getDefaultAdapter()
        }
      if (adapter == null) return "no bluetooth"
      when (mode) {
        "on" -> adapter.enable()
        "off" -> adapter.disable()
        else -> return "unknown bluetooth mode"
      }
      "bluetooth $mode"
    } catch (e: SecurityException) {
      "bluetooth permission missing"
    }
  }
}
