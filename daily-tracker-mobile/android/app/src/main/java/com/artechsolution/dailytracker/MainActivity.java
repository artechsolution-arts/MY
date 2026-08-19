package com.artechsolution.dailytracker;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The app runs from https://localhost while the API lives on a different domain,
        // so the session cookie is "third-party" from the WebView's point of view — Android
        // blocks those by default, which silently dropped the login cookie on every request.
        CookieManager.getInstance().setAcceptThirdPartyCookies(bridge.getWebView(), true);
    }
}
