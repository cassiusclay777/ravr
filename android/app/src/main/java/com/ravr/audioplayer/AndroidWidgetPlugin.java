package com.ravr.audioplayer;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AndroidWidget")
public class AndroidWidgetPlugin extends Plugin {

    @PluginMethod
    public void updateWidget(PluginCall call) {
        boolean isPlaying = call.getBoolean("isPlaying", false);
        String trackTitle = call.getString("trackTitle", "No Track");
        String artist = call.getString("artist", "Unknown Artist");

        // Update widget UI
        AudioWidget.updateWidgetState(getContext(), isPlaying, trackTitle, artist);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void notifyPlaybackState(PluginCall call) {
        String state = call.getString("state", "stopped");
        String trackTitle = call.getString("trackTitle", "");
        String artist = call.getString("artist", "");

        boolean isPlaying = "playing".equals(state);
        AudioWidget.updateWidgetState(getContext(), isPlaying, trackTitle, artist);

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
