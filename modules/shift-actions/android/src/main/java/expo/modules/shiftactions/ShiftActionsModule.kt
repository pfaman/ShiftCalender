package expo.modules.shiftactions

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ShiftActionsModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("ShiftActions")

    Function("hasPolicyAccess") {
      (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).isNotificationPolicyAccessGranted
    }

    Function("openPolicySettings") {
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    Function("bluetoothSupported") { Build.VERSION.SDK_INT <= 32 }

    // Replaces all scheduled phone actions with this plan; returns how many were scheduled.
    Function("schedule") { planJson: String -> ActionScheduler.schedule(context, planJson) }

    Function("applyNow") { sound: String?, bluetooth: String? -> PhoneActions.apply(context, sound, bluetooth) }
  }
}
