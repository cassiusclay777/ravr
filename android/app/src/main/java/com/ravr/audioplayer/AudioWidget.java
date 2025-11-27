package com.ravr.audioplayer;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/**
 * RAVR Audio Player Widget
 * Provides quick access to playback controls from the home screen
 */
public class AudioWidget extends AppWidgetProvider {

    public static final String ACTION_PLAY_PAUSE = "com.ravr.audioplayer.ACTION_PLAY_PAUSE";
    public static final String ACTION_NEXT = "com.ravr.audioplayer.ACTION_NEXT";
    public static final String ACTION_PREVIOUS = "com.ravr.audioplayer.ACTION_PREVIOUS";
    public static final String ACTION_STOP = "com.ravr.audioplayer.ACTION_STOP";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // Update all active widgets
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (action == null) return;

        // Handle widget button clicks
        switch (action) {
            case ACTION_PLAY_PAUSE:
                sendCommandToWebView(context, "playPause");
                break;
            case ACTION_NEXT:
                sendCommandToWebView(context, "next");
                break;
            case ACTION_PREVIOUS:
                sendCommandToWebView(context, "previous");
                break;
            case ACTION_STOP:
                sendCommandToWebView(context, "stop");
                break;
        }

        // Update widget UI
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(
            new ComponentName(context, AudioWidget.class)
        );
        onUpdate(context, appWidgetManager, appWidgetIds);
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // Create RemoteViews
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.audio_widget);

        // Set up button click intents
        views.setOnClickPendingIntent(R.id.widget_play_pause, 
            getPendingIntent(context, ACTION_PLAY_PAUSE));
        views.setOnClickPendingIntent(R.id.widget_next, 
            getPendingIntent(context, ACTION_NEXT));
        views.setOnClickPendingIntent(R.id.widget_previous, 
            getPendingIntent(context, ACTION_PREVIOUS));
        views.setOnClickPendingIntent(R.id.widget_stop, 
            getPendingIntent(context, ACTION_STOP));

        // Open app on widget click
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        // Update widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent getPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, AudioWidget.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void sendCommandToWebView(Context context, String command) {
        // Send command to MainActivity to execute in WebView
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction("com.ravr.audioplayer.WIDGET_COMMAND");
        intent.putExtra("command", command);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        context.startActivity(intent);
    }

    public static void updateWidgetState(Context context, boolean isPlaying, String trackTitle, String artist) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(
            new ComponentName(context, AudioWidget.class)
        );

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.audio_widget);
            
            // Update play/pause button
            views.setImageViewResource(R.id.widget_play_pause, 
                isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play);
            
            // Update track info
            views.setTextViewText(R.id.widget_track_title, trackTitle);
            views.setTextViewText(R.id.widget_artist, artist);

            // Set up button click intents
            views.setOnClickPendingIntent(R.id.widget_play_pause, 
                getPendingIntent(context, ACTION_PLAY_PAUSE));
            views.setOnClickPendingIntent(R.id.widget_next, 
                getPendingIntent(context, ACTION_NEXT));
            views.setOnClickPendingIntent(R.id.widget_previous, 
                getPendingIntent(context, ACTION_PREVIOUS));
            views.setOnClickPendingIntent(R.id.widget_stop, 
                getPendingIntent(context, ACTION_STOP));

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
