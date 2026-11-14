package expo.modules.shiftactions

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONArray

private const val PREFS = "shift_actions"
private const val KEY_PLAN = "plan"
private const val KEY_COUNT = "count"
private const val ACTION = "expo.modules.shiftactions.APPLY"

object ActionScheduler {
  private fun intent(context: Context) = Intent(context, ActionReceiver::class.java).setAction(ACTION)

  private fun pending(context: Context, index: Int, sound: String?, bluetooth: String?, create: Boolean): PendingIntent? {
    val i = intent(context)
    if (create) {
      i.putExtra("sound", sound ?: "")
      i.putExtra("bt", bluetooth ?: "")
    }
    val flags = (if (create) PendingIntent.FLAG_UPDATE_CURRENT else PendingIntent.FLAG_NO_CREATE) or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(context, index, i, flags)
  }

  private fun cancelAll(context: Context) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    for (i in 0 until prefs.getInt(KEY_COUNT, 0)) {
      pending(context, i, null, null, false)?.let {
        alarms.cancel(it)
        it.cancel()
      }
    }
  }

  // plan: [{"at": epochMillis, "sound": "silent"?, "bt": "off"?}, ...]. Replaces everything scheduled before.
  fun schedule(context: Context, planJson: String): Int {
    cancelAll(context)
    val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val plan = JSONArray(planJson)
    val now = System.currentTimeMillis()
    val kept = JSONArray()
    var n = 0
    for (k in 0 until plan.length()) {
      val o = plan.getJSONObject(k)
      val at = o.getLong("at")
      if (at <= now) continue
      val pi = pending(context, n, o.optString("sound", ""), o.optString("bt", ""), true)!!
      val exact = Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()
      if (exact) alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
      else alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
      kept.put(o)
      n++
    }
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString(KEY_PLAN, kept.toString())
      .putInt(KEY_COUNT, n)
      .apply()
    return n
  }

  // After a reboot all alarms are gone; schedule the saved plan again.
  fun restore(context: Context) {
    val saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_PLAN, null) ?: return
    schedule(context, saved)
  }
}
