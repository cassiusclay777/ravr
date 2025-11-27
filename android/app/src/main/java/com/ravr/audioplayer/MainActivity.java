package com.ravr.audioplayer;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register custom plugins
        registerPlugin(AndroidWidgetPlugin.class);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        // Handle widget commands
        if (intent != null && "com.ravr.audioplayer.WIDGET_COMMAND".equals(intent.getAction())) {
            String command = intent.getStringExtra("command");
            if (command != null) {
                executeWidgetCommand(command);
            }
        }
    }

    private void executeWidgetCommand(String command) {
        // Execute JavaScript in WebView to control audio
        String js = "";
        
        switch (command) {
            case "playPause":
                js = "window.androidWidgetPlayPause && window.androidWidgetPlayPause();";
                break;
            case "next":
                js = "window.androidWidgetNext && window.androidWidgetNext();";
                break;
            case "previous":
                js = "window.androidWidgetPrevious && window.androidWidgetPrevious();";
                break;
            case "stop":
                js = "window.androidWidgetStop && window.androidWidgetStop();";
                break;
        }
        
        if (!js.isEmpty() && bridge != null) {
            bridge.eval(js, null);
        }
    }
}
