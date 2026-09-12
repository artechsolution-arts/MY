package com.artechsolution.dailytracker;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

// Read-only home-screen glance card -- widgets are plain native Android
// views with no way to run the WebView's JS, so this just redraws whatever
// WidgetDataPlugin last cached in SharedPreferences. Tapping it opens the app.
public class DailyTrackerWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        updateWidgets(context, appWidgetManager, appWidgetIds);
    }

    static void updateWidgets(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(WidgetDataPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        String reminderText = prefs.getString(WidgetDataPlugin.KEY_REMINDER, "No reminders set");
        String notesPreview = prefs.getString(WidgetDataPlugin.KEY_NOTES, "No notes yet.");

        Intent launchIntent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_daily_tracker);
            views.setTextViewText(R.id.widget_reminder, reminderText);
            views.setTextViewText(R.id.widget_notes, notesPreview);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
            appWidgetManager.updateAppWidget(id, views);
        }
    }
}
