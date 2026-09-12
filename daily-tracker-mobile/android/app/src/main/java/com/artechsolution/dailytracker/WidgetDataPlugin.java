package com.artechsolution.dailytracker;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Bridges the web app's data to the native home-screen widget. The web side
// calls update() whenever notes/reminders change; this caches the small
// summary in SharedPreferences and asks Android to redraw every placed
// widget instance from it.
@CapacitorPlugin(name = "WidgetData")
public class WidgetDataPlugin extends Plugin {
    public static final String PREFS_NAME = "widget_data";
    public static final String KEY_REMINDER = "reminder_text";
    public static final String KEY_NOTES = "notes_preview";

    @PluginMethod
    public void update(PluginCall call) {
        String reminderText = call.getString("reminderText", "");
        String notesPreview = call.getString("notesPreview", "");

        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_REMINDER, reminderText).putString(KEY_NOTES, notesPreview).apply();

        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, DailyTrackerWidgetProvider.class);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids.length > 0) {
            DailyTrackerWidgetProvider.updateWidgets(context, manager, ids);
        }

        call.resolve();
    }
}
