package com.shuayb.recruitment;

import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Candidate/passport data is sensitive: prevent screenshots, screen recording,
        // and exposure in the Android recent-apps preview.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }
}
