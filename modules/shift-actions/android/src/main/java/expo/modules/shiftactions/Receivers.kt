package expo.modules.shiftactions

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    PhoneActions.apply(context, intent.getStringExtra("sound"), intent.getStringExtra("bt"))
  }
}

class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == Intent.ACTION_BOOT_COMPLETED) ActionScheduler.restore(context)
  }
}
